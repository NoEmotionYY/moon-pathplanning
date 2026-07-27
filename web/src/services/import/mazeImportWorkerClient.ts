import type { ImageMatrix } from '@/types/import'
import type {
  MazeImportPipelineOptionOverrides,
  MazeImportProgressCallback,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerAnalyzeRequest,
  MazeImportWorkerResponse,
  MazeImportWorkerResult,
  MazeImportWorkerResultDetail,
} from '@/types/mazeImportWorker'
import { createMazeImportRequestId } from './mazeImportRequestId'
import { MazeImportWorkerError } from './mazeImportWorkerError'
import {
  isMazeImportWorkerResponse,
  isMazeImportWorkerResult,
} from './mazeImportWorkerProtocol'

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void
  terminate(): void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null
}

export type MazeImportWorkerFactory = () => WorkerLike

export type MazeImportWorkerConcurrencyPolicy =
  | 'latest-wins'
  | 'reject-when-busy'

export interface MazeImportWorkerAnalyzeOptions {
  pipeline?: MazeImportPipelineOptionOverrides
  resultDetail?: MazeImportWorkerResultDetail
  signal?: AbortSignal
  onProgress?: MazeImportProgressCallback
}

export interface MazeImportWorkerClient {
  analyze(
    image: ImageMatrix,
    options?: MazeImportWorkerAnalyzeOptions,
  ): Promise<MazeImportWorkerResult>
  cancelCurrent(): void
  terminate(): void
  isBusy(): boolean
}

export interface MazeImportWorkerClientOptions {
  workerFactory?: MazeImportWorkerFactory
  concurrencyPolicy?: MazeImportWorkerConcurrencyPolicy
  createRequestId?: () => string
}

interface WorkerState {
  instance: WorkerLike
  generation: number
}

interface ActiveRequest {
  requestId: string
  workerGeneration: number
  resolve: (result: MazeImportWorkerResult) => void
  reject: (error: MazeImportWorkerError) => void
  onProgress?: MazeImportProgressCallback
  lastProgress: number
  removeAbortListener: () => void
}

const createBrowserWorker: MazeImportWorkerFactory = () =>
  new Worker(
    new URL('../../workers/mazeImport.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'maze-import-worker',
    },
  )

class MazeImportWorkerClientImpl implements MazeImportWorkerClient {
  private worker: WorkerState | null = null
  private active: ActiveRequest | null = null
  private generation = 0
  private terminated = false
  private readonly workerFactory: MazeImportWorkerFactory
  private readonly concurrencyPolicy: MazeImportWorkerConcurrencyPolicy
  private readonly createRequestId: () => string

  constructor(options: MazeImportWorkerClientOptions = {}) {
    this.workerFactory = options.workerFactory ?? createBrowserWorker
    this.concurrencyPolicy =
      options.concurrencyPolicy ?? 'latest-wins'
    this.createRequestId =
      options.createRequestId ?? createMazeImportRequestId
  }

  private ensureWorker(): WorkerState {
    if (this.terminated) {
      throw new MazeImportWorkerError(
        'MAZE_IMPORT_WORKER_TERMINATED',
        '迷宫分析 Worker 客户端已永久终止。',
      )
    }
    if (this.worker) {
      return this.worker
    }
    let instance: WorkerLike
    try {
      instance = this.workerFactory()
    } catch {
      throw new MazeImportWorkerError(
        'MAZE_IMPORT_WORKER_CRASHED',
        '无法创建迷宫分析 Worker。',
      )
    }
    const generation = ++this.generation
    instance.onmessage = (event) => {
      this.handleMessage(event, generation)
    }
    instance.onerror = (event) => {
      event.preventDefault?.()
      this.handleWorkerFailure(
        generation,
        'MAZE_IMPORT_WORKER_CRASHED',
        '迷宫分析 Worker 运行异常。',
      )
    }
    instance.onmessageerror = () => {
      this.handleWorkerFailure(
        generation,
        'MAZE_IMPORT_WORKER_PROTOCOL_ERROR',
        '无法反序列化迷宫分析 Worker 响应。',
      )
    }
    this.worker = { instance, generation }
    return this.worker
  }

  private disposeWorker(generation?: number): void {
    const worker = this.worker
    if (!worker || (
      generation !== undefined &&
      worker.generation !== generation
    )) {
      return
    }
    worker.instance.onmessage = null
    worker.instance.onerror = null
    worker.instance.onmessageerror = null
    worker.instance.terminate()
    this.worker = null
  }

  private settleActive(
    active: ActiveRequest,
    settlement: () => void,
  ): void {
    if (this.active !== active) {
      return
    }
    this.active = null
    active.removeAbortListener()
    settlement()
  }

  private rejectActive(
    active: ActiveRequest,
    code: string,
    message: string,
    disposeWorker: boolean,
  ): void {
    this.settleActive(active, () => {
      if (disposeWorker) {
        this.disposeWorker(active.workerGeneration)
      }
      active.reject(
        new MazeImportWorkerError(
          code,
          message,
          active.requestId,
        ),
      )
    })
  }

  private handleWorkerFailure(
    generation: number,
    code: string,
    message: string,
  ): void {
    const active = this.active
    if (active?.workerGeneration === generation) {
      this.rejectActive(active, code, message, true)
    } else {
      this.disposeWorker(generation)
    }
  }

  private handleMessage(
    event: MessageEvent<unknown>,
    generation: number,
  ): void {
    const active = this.active
    if (!active || active.workerGeneration !== generation) {
      return
    }
    const value = event.data
    if (
      value &&
      typeof value === 'object' &&
      (value as Record<string, unknown>).type !== 'ready' &&
      typeof (value as Record<string, unknown>).requestId === 'string' &&
      (value as Record<string, unknown>).requestId !== active.requestId
    ) {
      return
    }
    if (!isMazeImportWorkerResponse(value)) {
      const code =
        value &&
        typeof value === 'object' &&
        (value as Record<string, unknown>).type === 'completed'
          ? 'MAZE_IMPORT_WORKER_RESULT_INVALID'
          : 'MAZE_IMPORT_WORKER_PROTOCOL_ERROR'
      this.rejectActive(
        active,
        code,
        code === 'MAZE_IMPORT_WORKER_RESULT_INVALID'
          ? 'Worker 返回了无效的迷宫分析结果。'
          : 'Worker 返回了无效的迷宫分析协议消息。',
        true,
      )
      return
    }
    const message: MazeImportWorkerResponse = value
    if (message.type === 'ready') {
      return
    }
    if (message.requestId !== active.requestId) {
      return
    }
    if (
      message.type === 'started' ||
      message.type === 'pong'
    ) {
      return
    }
    if (message.type === 'progress') {
      if (message.progress.progress <= active.lastProgress) {
        return
      }
      active.lastProgress = message.progress.progress
      try {
        active.onProgress?.(message.progress)
      } catch {
        // 消费方进度回调不能破坏 Worker 生命周期。
      }
      return
    }
    if (message.type === 'completed') {
      if (!isMazeImportWorkerResult(message.result)) {
        this.rejectActive(
          active,
          'MAZE_IMPORT_WORKER_RESULT_INVALID',
          'Worker 返回了无效的迷宫分析结果。',
          true,
        )
        return
      }
      this.settleActive(active, () => {
        active.resolve(message.result)
      })
      return
    }
    if (message.type === 'failed') {
      this.rejectActive(
        active,
        message.error.code,
        message.error.message,
        false,
      )
      return
    }
    this.rejectActive(
      active,
      'IMPORT_CANCELLED',
      '迷宫分析已取消。',
      false,
    )
  }

  analyze(
    image: ImageMatrix,
    options: MazeImportWorkerAnalyzeOptions = {},
  ): Promise<MazeImportWorkerResult> {
    if (this.terminated) {
      return Promise.reject(new MazeImportWorkerError(
        'MAZE_IMPORT_WORKER_TERMINATED',
        '迷宫分析 Worker 客户端已永久终止。',
      ))
    }
    if (options.signal?.aborted) {
      return Promise.reject(new MazeImportWorkerError(
        'IMPORT_CANCELLED',
        '迷宫分析在发送前已取消。',
      ))
    }
    if (this.active) {
      if (this.concurrencyPolicy === 'reject-when-busy') {
        return Promise.reject(new MazeImportWorkerError(
          'MAZE_IMPORT_WORKER_BUSY',
          '迷宫分析客户端正在处理其他请求。',
        ))
      }
      this.cancelCurrent()
    }

    let worker: WorkerState
    try {
      worker = this.ensureWorker()
    } catch (error) {
      return Promise.reject(error)
    }
    const requestId = this.createRequestId()
    return new Promise<MazeImportWorkerResult>((resolve, reject) => {
      let abortListener: (() => void) | null = null
      const active: ActiveRequest = {
        requestId,
        workerGeneration: worker.generation,
        resolve,
        reject,
        onProgress: options.onProgress,
        lastProgress: -1,
        removeAbortListener: () => {
          if (abortListener && options.signal) {
            options.signal.removeEventListener(
              'abort',
              abortListener,
            )
          }
          abortListener = null
        },
      }
      abortListener = () => {
        if (this.active === active) {
          this.cancelCurrent()
        }
      }
      options.signal?.addEventListener('abort', abortListener, {
        once: true,
      })
      this.active = active

      // 预览所持有的原数组必须继续可用；只复制一次 Worker 专用 RGBA，
      // 再通过 transfer 转移该副本的 ArrayBuffer 所有权。
      const workerRgba = image.rgba.slice()
      const message: MazeImportWorkerAnalyzeRequest = {
        type: 'analyze',
        requestId,
        image: {
          width: image.width,
          height: image.height,
          rgba: workerRgba,
        },
        options: options.pipeline,
        resultDetail: options.resultDetail ?? 'preview',
      }
      try {
        worker.instance.postMessage(
          message,
          [workerRgba.buffer],
        )
      } catch {
        this.rejectActive(
          active,
          'MAZE_IMPORT_WORKER_POST_FAILED',
          '无法向迷宫分析 Worker 发送请求。',
          true,
        )
      }
    })
  }

  cancelCurrent(): void {
    const active = this.active
    if (!active) {
      return
    }
    // 同步 CPU 算法无法及时处理普通 cancel 消息，因此硬取消直接终止 Worker。
    this.rejectActive(
      active,
      'IMPORT_CANCELLED',
      '迷宫分析已取消。',
      true,
    )
  }

  terminate(): void {
    if (this.terminated) {
      return
    }
    this.terminated = true
    const active = this.active
    if (active) {
      this.rejectActive(
        active,
        'MAZE_IMPORT_WORKER_TERMINATED',
        '迷宫分析 Worker 客户端已永久终止。',
        true,
      )
    } else {
      this.disposeWorker()
    }
  }

  isBusy(): boolean {
    return this.active !== null
  }
}

export function createMazeImportWorkerClient(
  options: MazeImportWorkerClientOptions = {},
): MazeImportWorkerClient {
  return new MazeImportWorkerClientImpl(options)
}
