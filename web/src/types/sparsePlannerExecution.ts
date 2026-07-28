import type { AlgorithmId } from './planner'
import type { SparseGridWorld } from '@/services/world/SparseGridWorld'
import type { DeriveSparsePlanningWindowOptions } from '@/services/world/deriveSparsePlanningWindow'
import type {
  MaterializedSparsePlanningWindow,
  SparsePlanningWindowRequest,
  WorldPlannerResult,
  WorldTraceBatchMessage,
} from './worldPlanning'

export type SparsePlanningWindowSelection =
  | { readonly kind: 'explicit'; readonly request: SparsePlanningWindowRequest }
  | { readonly kind: 'derived'; readonly options?: DeriveSparsePlanningWindowOptions }

export interface SparsePlannerRunInput {
  readonly world: SparseGridWorld
  readonly algorithm: AlgorithmId
  readonly window: SparsePlanningWindowSelection
  readonly plannerOptions?: Readonly<Record<string, unknown>>
  readonly getCurrentWorldVersion: () => number
  readonly onTraceBatch?: (message: WorldTraceBatchMessage) => void
}

export type SparsePlannerExecutionPhase =
  | 'idle' | 'materializing' | 'running' | 'completed'
  | 'cancelled' | 'stale' | 'failed'

export interface SparsePlannerExecutionMetrics {
  readonly requestId: string
  readonly materializationMs: number
  readonly workerMs: number
  readonly totalMs: number
  readonly sourceWorldVersion: number
  readonly width: number
  readonly height: number
  readonly cellCount: number
  readonly obstacleCount: number
  readonly terrainCount: number
  readonly receivedTraceBatchCount: number
  readonly receivedTraceEventCount: number
}

export interface SparsePlannerExecutionResult {
  readonly requestId: string
  readonly result: WorldPlannerResult
  readonly materialized: MaterializedSparsePlanningWindow
  readonly metrics: SparsePlannerExecutionMetrics
}

export interface SparsePlannerExecutionSnapshot {
  readonly phase: SparsePlannerExecutionPhase
  readonly requestId: string | null
  readonly sourceWorldVersion: number | null
  readonly error: { readonly code: string; readonly message: string } | null
}
