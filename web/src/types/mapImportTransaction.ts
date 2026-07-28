import type { GridMapDocument, PointTuple } from './grid'
import type {
  AlgorithmId,
  PlannerError,
  PlannerResult,
  PlannerStatus,
} from './planner'
import type { PlaybackStatus, SearchEvent, TraceMode } from './trace'

export type MapImportTransactionStatus =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'busy'

export interface MapImportTransactionOptions {
  source: 'maze-image' | 'json'
  expectedCurrentMapVersion?: number
  preserveSelectedAlgorithm?: boolean
  preservePlaybackSpeed?: boolean
  signal?: AbortSignal
}

export interface MapImportTransactionTiming {
  validationMs: number
  snapshotMs: number
  bulkApplyMs: number
  postconditionMs: number
  totalMs: number
}

export interface MapImportTransactionMetrics {
  previousMapVersion: number
  nextMapVersion: number
  width: number
  height: number
  obstacleCount: number
  terrainCount: number
  plannerWasRunning: boolean
  traceWasActive: boolean
  timing: MapImportTransactionTiming
}

export interface MapImportTransactionError {
  code: string
  message: string
}

export interface MapImportTransactionResult {
  status: MapImportTransactionStatus
  applied: boolean
  metrics: MapImportTransactionMetrics | null
  error: MapImportTransactionError | null
  warnings: string[]
}

export interface MapImportCapability {
  allowed: boolean
  maximumImportWidth: number
  maximumImportHeight: number
  supportsLargeGridRendering: boolean
  reason?: string
  warnings: string[]
  error?: MapImportTransactionError
}

export interface GridMapImportState {
  document: GridMapDocument
  mapVersion: number
  dirty: boolean
}

export interface PlannerTraceImportState {
  supported: boolean
  mode: TraceMode
  events: SearchEvent[]
  totalSteps: number
  receivedSteps: number
  requestId: string | null
  mapVersion: number | null
  algorithm: AlgorithmId | null
}

export interface PlannerPlaybackImportState {
  status: PlaybackStatus
  speed: number
  currentEventIndex: number
  visitedCells: Set<string>
  expandedCells: Set<string>
  frontierCells: Set<string>
  currentCell: PointTuple | null
}

export interface PlannerImportState {
  selectedAlgorithm: AlgorithmId
  status: PlannerStatus
  result: PlannerResult | null
  error: PlannerError | null
  executionTime: number | null
  resultVersion: number | null
  currentRequestId: string | null
  requestGeneration: number
  trace: PlannerTraceImportState
  playback: PlannerPlaybackImportState
}

export interface MapImportSnapshot {
  grid: GridMapImportState
  planner: PlannerImportState
}
