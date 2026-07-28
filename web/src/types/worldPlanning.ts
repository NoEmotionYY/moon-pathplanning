import type { GridMapDocument, PointTuple } from './grid'
import type { PlannerResult, TraceBatchMessage } from './planner'
import type { SearchEvent, SearchTrace } from './trace'
import type {
  PlanningCoordinateTransform,
  WorldBounds,
  WorldPointTuple,
} from './worldGrid'

export interface SparsePlanningWindowRequest {
  readonly bounds: WorldBounds
  readonly maxExpandedNodes?: number
  readonly timeoutMs?: number
  readonly tracePolicy?: 'full' | 'limited' | 'disabled'
}

export interface SparsePlanningWindowCapability {
  readonly allowed: boolean
  readonly width: number
  readonly height: number
  readonly cellCount: number
  readonly recommended: boolean
  readonly largeWindow: boolean
  readonly warnings: readonly string[]
  readonly error: { readonly code: string; readonly message: string } | null
}

export interface SparsePlanningMaterializationMetrics {
  readonly width: number
  readonly height: number
  readonly cellCount: number
  readonly obstacleCount: number
  readonly terrainCount: number
  readonly sourceWorldVersion: number
  readonly intersectingChunkCount: number
}

export interface MaterializedSparsePlanningWindow {
  readonly document: GridMapDocument
  readonly transform: PlanningCoordinateTransform
  readonly worldBounds: WorldBounds
  readonly sourceWorldVersion: number
  readonly request: SparsePlanningWindowRequest
  readonly capability: SparsePlanningWindowCapability
  readonly metrics: SparsePlanningMaterializationMetrics
}

export type WorldSearchEvent = Omit<SearchEvent, 'point'> & {
  readonly point: WorldPointTuple
}

export type WorldSearchTrace = Omit<SearchTrace, 'events'> & {
  readonly events: readonly WorldSearchEvent[]
}

export type WorldTraceBatchMessage = Omit<TraceBatchMessage, 'events'> & {
  readonly events: readonly WorldSearchEvent[]
  readonly sourceWorldVersion: number
  readonly worldBounds: WorldBounds
}

export type WorldPlannerResultStatus = 'found' | 'no_path_in_window' | 'invalid_input'

export type WorldPlannerResult = Omit<PlannerResult, 'status' | 'path' | 'trace'> & {
  readonly status: WorldPlannerResultStatus
  readonly path: readonly WorldPointTuple[]
  readonly trace?: WorldSearchTrace
  readonly sourceWorldVersion: number
  readonly worldBounds: WorldBounds
  readonly globallyConclusive: boolean
}

export type LocalPlanningPointTuple = PointTuple
