import type {
  AlgorithmId,
  PlannerRequest,
  PlannerResult,
  TraceBatchMessage,
} from '@/types/planner'

export interface SparsePlannerTransport {
  request(
    payload: PlannerRequest,
    requestId: string,
    mapVersion: number,
    algorithm: AlgorithmId,
    onTraceBatch?: (message: TraceBatchMessage) => void,
    timeoutMs?: number,
  ): Promise<PlannerResult>
  cancel(requestId: string): void
  hardCancel(requestId?: string | null): void
  dispose(): void
}
