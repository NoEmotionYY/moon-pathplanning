import type {
  AlgorithmId,
  PlannerRequest,
  PlannerResult,
  PlannerWorkerResponse,
  TraceBatchMessage,
} from '@/types/planner'

interface PendingRequest {
  resolve: (result: PlannerResult) => void
  reject: (error: Error) => void
  timeout: number
  onTraceBatch?: (message: TraceBatchMessage) => void
}

export class PlannerWorkerClient {
  private worker: Worker | null = null
  private pending = new Map<string, PendingRequest>()

  constructor(private readonly workerFactory = () =>
    new Worker(new URL('../workers/planner.worker.ts', import.meta.url), { type: 'module' })) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    try {
      this.worker = this.workerFactory()
      this.worker.addEventListener('message', this.handleMessage)
      this.worker.addEventListener('error', this.handleWorkerError)
      return this.worker
    } catch {
      throw new Error('无法初始化路径规划 Worker')
    }
  }

  private handleMessage = (event: MessageEvent<PlannerWorkerResponse>) => {
    const pending = this.pending.get(event.data.requestId)
    if (!pending) return
    if (event.data.type === 'run-started') return
    if (event.data.type === 'trace-batch') {
      pending.onTraceBatch?.(event.data)
      return
    }
    window.clearTimeout(pending.timeout)
    this.pending.delete(event.data.requestId)
    if (event.data.type === 'run-completed') {
      pending.resolve(event.data.result)
    } else if (event.data.type === 'run-failed') {
      pending.reject(new Error(event.data.error.message))
    } else {
      pending.reject(new Error('请求已取消'))
    }
  }

  private handleWorkerError = () => {
    this.rejectAll('路径规划 Worker 运行异常')
    this.disposeWorker()
  }

  request(
    payload: PlannerRequest,
    requestId: string,
    mapVersion: number,
    algorithm: AlgorithmId,
    onTraceBatch?: (message: TraceBatchMessage) => void,
    timeoutMs = 20_000,
  ): Promise<PlannerResult> {
    const worker = this.ensureWorker()
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error('路径规划请求超时'))
        this.disposeWorker()
      }, timeoutMs)
      this.pending.set(requestId, { resolve, reject, timeout, onTraceBatch })
      worker.postMessage({ type: 'run', requestId, payload, mapVersion, algorithm })
    })
  }

  cancel(requestId: string): void {
    const pending = this.pending.get(requestId)
    if (!pending) return
    this.worker?.postMessage({ type: 'cancel', requestId })
    window.clearTimeout(pending.timeout)
    pending.reject(new Error('请求已取消'))
    this.pending.delete(requestId)
    this.disposeWorker()
  }

  hardCancel(requestId: string | null = null): void {
    if (requestId && this.pending.has(requestId)) {
      this.worker?.postMessage({ type: 'cancel', requestId })
    }
    this.rejectAll('请求已取消')
    this.disposeWorker()
  }

  private rejectAll(message: string): void {
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeout)
      pending.reject(new Error(message))
    }
    this.pending.clear()
  }

  private disposeWorker(): void {
    this.worker?.terminate()
    this.worker = null
  }

  dispose(): void {
    this.rejectAll('规划服务已关闭')
    this.disposeWorker()
  }
}

export const plannerWorkerClient = new PlannerWorkerClient()
