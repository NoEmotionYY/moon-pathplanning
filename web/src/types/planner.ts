import type { GridMapDocument, MovementMode, PointTuple } from './grid'
import type { SearchEvent, SearchTrace, TraceMode } from './trace'

export type AlgorithmId =
  | 'bfs'
  | 'dfs'
  | 'dijkstra'
  | 'astar'
  | 'bidirectional_astar'
  | 'lpa_star'
  | 'd_star_lite'
  | 'pso'
  | 'rs_apso'
  | 'rrt'
  | 'rrt_connect'
  | 'rrt_star'

export type AlgorithmCategory = '经典搜索' | '增量规划' | '群智能' | '采样规划'

export interface AlgorithmMetadata {
  id: AlgorithmId
  name: string
  category: AlgorithmCategory
  description: string
  supportsTrace: boolean
  supportsWeightedTerrain: boolean
  supportsEightWay: boolean
  isExperimental: boolean
}

export type PlannerStatus =
  | 'idle'
  | 'running'
  | 'found'
  | 'no_path'
  | 'invalid_input'
  | 'error'
  | 'stale'

export interface PlannerError {
  code: string
  message: string
}

export interface PlannerRequest {
  algorithm: AlgorithmId
  map: GridMapDocument
  options: Record<string, unknown>
}

export interface PlannerResult {
  success: boolean
  status: 'found' | 'no_path' | 'invalid_input'
  algorithm: AlgorithmId
  movement: MovementMode
  path: PointTuple[]
  pathNodes: number
  totalCost: number
  visitedNodes: number
  expandedNodes: number
  iterations: number | null
  treeNodes: number | null
  trace?: SearchTrace
  error: PlannerError | null
}

export interface RunPlannerMessage {
  type: 'run'
  requestId: string
  payload: PlannerRequest
  mapVersion: number
  algorithm: AlgorithmId
}

export interface CancelPlannerMessage {
  type: 'cancel'
  requestId: string
}

export type PlannerWorkerMessage = RunPlannerMessage | CancelPlannerMessage

export interface RunStartedMessage {
  type: 'run-started'
  requestId: string
}

export interface TraceBatchMessage {
  type: 'trace-batch'
  requestId: string
  events: SearchEvent[]
  offset: number
  done: boolean
  supported: boolean
  mode: TraceMode
  totalSteps: number
}

export interface RunCompletedMessage {
  type: 'run-completed'
  requestId: string
  result: PlannerResult
}

export interface RunFailedMessage {
  type: 'run-failed'
  requestId: string
  error: PlannerError
}

export interface RunCancelledMessage {
  type: 'run-cancelled'
  requestId: string
}

export type PlannerWorkerResponse =
  | RunStartedMessage
  | TraceBatchMessage
  | RunCompletedMessage
  | RunFailedMessage
  | RunCancelledMessage
