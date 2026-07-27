import type { ImageMatrix } from '@/types/import'
import type {
  MazeImportPipelineOptionOverrides,
  MazeImportPipelineResult,
  MazeImportProgressCallback,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerAnalyzeRequest,
  MazeImportWorkerRequest,
  MazeImportWorkerResponse,
} from '@/types/mazeImportWorker'
import { createWorkerSafeResult } from '@/services/import/mazeImportWorkerResult'
import { isMazeImportWorkerRequest } from '@/services/import/mazeImportWorkerProtocol'

type AnalyzeRasterMaze = (
  image: ImageMatrix,
  options?: MazeImportPipelineOptionOverrides,
  signal?: AbortSignal,
  onProgress?: MazeImportProgressCallback,
) => Promise<MazeImportPipelineResult>

export interface MazeImportWorkerHandlerDependencies {
  postMessage: (response: MazeImportWorkerResponse) => void
  analyzeRasterMaze: AnalyzeRasterMaze
  createAbortController?: () => AbortController
}

interface ActiveWorkerAnalysis {
  requestId: string
  controller: AbortController
}

const errorData = (
  error: unknown,
): { code: string; message: string } => {
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    if (
      typeof candidate.code === 'string' &&
      typeof candidate.message === 'string'
    ) {
      return {
        code: candidate.code,
        message: candidate.message,
      }
    }
  }
  return {
    code: 'MAZE_IMPORT_WORKER_FAILED',
    message: error instanceof Error
      ? error.message
      : '迷宫分析 Worker 执行失败。',
  }
}

export function createMazeImportWorkerHandler(
  dependencies: MazeImportWorkerHandlerDependencies,
): {
  handleMessage(message: unknown): Promise<void>
} {
  const createController =
    dependencies.createAbortController ?? (() => new AbortController())
  const cancelledBeforeStart = new Set<string>()
  let active: ActiveWorkerAnalysis | null = null

  const postFailed = (
    requestId: string,
    code: string,
    message: string,
  ): void => {
    dependencies.postMessage({
      type: 'failed',
      requestId,
      error: { code, message },
    })
  }

  const handleAnalyze = async (
    message: MazeImportWorkerAnalyzeRequest,
  ): Promise<void> => {
    if (active) {
      postFailed(
        message.requestId,
        'MAZE_IMPORT_WORKER_BUSY',
        '迷宫分析 Worker 正在处理其他请求。',
      )
      return
    }
    if (cancelledBeforeStart.delete(message.requestId)) {
      dependencies.postMessage({
        type: 'cancelled',
        requestId: message.requestId,
      })
      return
    }

    const controller = createController()
    active = { requestId: message.requestId, controller }
    dependencies.postMessage({
      type: 'started',
      requestId: message.requestId,
    })
    try {
      const result = await dependencies.analyzeRasterMaze(
        message.image,
        message.options,
        controller.signal,
        (progress) => {
          if (
            active?.requestId === message.requestId &&
            !controller.signal.aborted
          ) {
            dependencies.postMessage({
              type: 'progress',
              requestId: message.requestId,
              progress,
            })
          }
        },
      )
      if (controller.signal.aborted || result.status === 'cancelled') {
        dependencies.postMessage({
          type: 'cancelled',
          requestId: message.requestId,
        })
        return
      }
      dependencies.postMessage({
        type: 'completed',
        requestId: message.requestId,
        result: createWorkerSafeResult(
          result,
          message.resultDetail ?? 'preview',
        ),
      })
    } catch (error) {
      const normalized = errorData(error)
      postFailed(
        message.requestId,
        normalized.code,
        normalized.message,
      )
    } finally {
      if (active?.requestId === message.requestId) {
        active = null
      }
    }
  }

  const handleMessage = async (value: unknown): Promise<void> => {
    if (!isMazeImportWorkerRequest(value)) {
      const requestId =
        value &&
        typeof value === 'object' &&
        typeof (value as Record<string, unknown>).requestId === 'string'
          ? String((value as Record<string, unknown>).requestId)
          : null
      if (requestId) {
        postFailed(
          requestId,
          'MAZE_IMPORT_WORKER_PROTOCOL_ERROR',
          'Worker 收到无效的迷宫分析请求。',
        )
      }
      return
    }
    const message: MazeImportWorkerRequest = value
    if (message.type === 'ping') {
      dependencies.postMessage({
        type: 'pong',
        requestId: message.requestId,
      })
      return
    }
    if (message.type === 'cancel') {
      if (active?.requestId === message.requestId) {
        // 只能在事件循环有机会处理消息时软取消；同步 CPU 阶段由主线程 terminate。
        active.controller.abort()
      } else {
        cancelledBeforeStart.add(message.requestId)
        dependencies.postMessage({
          type: 'cancelled',
          requestId: message.requestId,
        })
      }
      return
    }
    await handleAnalyze(message)
  }

  return { handleMessage }
}
