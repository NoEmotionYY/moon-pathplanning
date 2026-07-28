import type {
  AlgorithmId,
  PlannerRequest,
  PlannerResult,
  TraceBatchMessage,
} from '@/types/planner'
import type { SparsePlannerTransport } from '../sparsePlannerTransport'

export interface RecordedSparsePlannerRequest {
  payload: PlannerRequest
  requestId: string
  mapVersion: number
  algorithm: AlgorithmId
  timeoutMs?: number
}

export class FakeSparsePlannerTransport implements SparsePlannerTransport {
  readonly requests: RecordedSparsePlannerRequest[] = []
  readonly cancelled: string[] = []
  readonly hardCancelled: Array<string | null | undefined> = []
  disposeCount = 0
  throwOnCancel: unknown = null
  private resolvePending: ((result: PlannerResult) => void) | null = null
  private rejectPending: ((error: unknown) => void) | null = null
  private traceCallback: ((message: TraceBatchMessage) => void) | undefined

  request(
    payload: PlannerRequest,
    requestId: string,
    mapVersion: number,
    algorithm: AlgorithmId,
    onTraceBatch?: (message: TraceBatchMessage) => void,
    timeoutMs?: number,
  ): Promise<PlannerResult> {
    this.requests.push({ payload, requestId, mapVersion, algorithm, timeoutMs })
    this.traceCallback = onTraceBatch
    return new Promise((resolve, reject) => {
      this.resolvePending = resolve
      this.rejectPending = reject
    })
  }

  emitTrace(message: TraceBatchMessage): void {
    this.traceCallback?.(message)
  }

  resolve(result: PlannerResult): void {
    this.resolvePending?.(result)
  }

  reject(error: unknown): void {
    this.rejectPending?.(error)
  }

  cancel(requestId: string): void {
    this.cancelled.push(requestId)
    if (this.throwOnCancel) throw this.throwOnCancel
  }

  hardCancel(requestId?: string | null): void {
    this.hardCancelled.push(requestId)
  }

  dispose(): void {
    this.disposeCount += 1
  }
}
