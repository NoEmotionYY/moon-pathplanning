import {
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
  shallowReadonly,
  shallowRef,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import type { ImageMatrix } from '@/types/import'
import type { MazeImportPipelineProgress } from '@/types/mazeImportPipeline'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import {
  createMazeImportWorkerClient,
  type MazeImportWorkerAnalyzeOptions,
  type MazeImportWorkerClient,
} from '@/services/import/mazeImportWorkerClient'
import { MazeImportWorkerError } from '@/services/import/mazeImportWorkerError'

export type MazeImportAnalysisStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'manual-input-required'
  | 'unsupported-topology'
  | 'failed'
  | 'cancelled'

export interface UseMazeImportAnalysis {
  status: Readonly<Ref<MazeImportAnalysisStatus>>
  progress: Readonly<Ref<MazeImportPipelineProgress | null>>
  result: Readonly<ShallowRef<MazeImportWorkerResult | null>>
  error: Readonly<Ref<MazeImportWorkerError | null>>
  analyze(
    image: ImageMatrix,
    options?: MazeImportWorkerAnalyzeOptions,
  ): Promise<MazeImportWorkerResult | null>
  cancel(): void
  reset(): void
  dispose(): void
}

export type MazeImportAnalysisFactory = () => UseMazeImportAnalysis

export const MAZE_IMPORT_ANALYSIS_FACTORY:
  InjectionKey<MazeImportAnalysisFactory> = Symbol(
    'maze-import-analysis-factory',
  )

const normalizeClientError = (value: unknown): MazeImportWorkerError => {
  if (value instanceof MazeImportWorkerError) {
    return value
  }
  return new MazeImportWorkerError(
    'MAZE_IMPORT_WORKER_CRASHED',
    value instanceof Error ? value.message : '迷宫分析 Worker 调用失败。',
  )
}

export function useMazeImportAnalysis(
  client: MazeImportWorkerClient =
    createMazeImportWorkerClient(),
): UseMazeImportAnalysis {
  const status = ref<MazeImportAnalysisStatus>('idle')
  const progress = ref<MazeImportPipelineProgress | null>(null)
  const result = shallowRef<MazeImportWorkerResult | null>(null)
  const error = ref<MazeImportWorkerError | null>(null)
  let operationId = 0
  let disposed = false

  const analyze = async (
    image: ImageMatrix,
    options: MazeImportWorkerAnalyzeOptions = {},
  ): Promise<MazeImportWorkerResult | null> => {
    if (disposed) {
      const disposedError = new MazeImportWorkerError(
        'MAZE_IMPORT_WORKER_TERMINATED',
        '迷宫分析服务已释放。',
      )
      status.value = 'failed'
      error.value = disposedError
      return null
    }
    if (status.value === 'running') {
      client.cancelCurrent()
    }
    const currentOperation = ++operationId
    status.value = 'running'
    progress.value = null
    result.value = null
    error.value = null
    try {
      const completed = await client.analyze(image, {
        ...options,
        onProgress: (update) => {
          if (currentOperation !== operationId) {
            return
          }
          progress.value = update
          try {
            options.onProgress?.(update)
          } catch {
            // 外部进度观察者不能破坏 composable 状态。
          }
        },
      })
      if (currentOperation !== operationId) {
        return null
      }
      result.value = completed
      status.value = completed.status
      if (completed.status === 'failed') {
        error.value = new MazeImportWorkerError(
          completed.error?.code ?? 'MAZE_IMPORT_WORKER_RESULT_INVALID',
          completed.error?.message ?? '迷宫分析失败。',
        )
      }
      return completed
    } catch (caught) {
      if (currentOperation !== operationId) {
        return null
      }
      const workerError = normalizeClientError(caught)
      error.value = workerError
      status.value = workerError.code === 'IMPORT_CANCELLED'
        ? 'cancelled'
        : 'failed'
      return null
    }
  }

  const cancel = (): void => {
    if (status.value !== 'running') {
      return
    }
    operationId += 1
    client.cancelCurrent()
    status.value = 'cancelled'
    progress.value = null
    result.value = null
    error.value = new MazeImportWorkerError(
      'IMPORT_CANCELLED',
      '迷宫分析已取消。',
    )
  }

  const reset = (): void => {
    if (status.value === 'running') {
      operationId += 1
      client.cancelCurrent()
    }
    status.value = 'idle'
    progress.value = null
    result.value = null
    error.value = null
  }

  const dispose = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    operationId += 1
    client.terminate()
    status.value = 'idle'
    progress.value = null
    result.value = null
    error.value = null
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  return {
    status: readonly(status),
    progress: readonly(progress),
    result: shallowReadonly(result),
    error: readonly(error),
    analyze,
    cancel,
    reset,
    dispose,
  }
}
