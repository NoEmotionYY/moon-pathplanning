import type { GridMapDocument } from './grid'
import type { BinaryMask } from './imageAnalysis'
import type { ImageMatrix } from './import'
import type {
  EntranceCandidateState,
  EntranceSelectionStatus,
} from './mazeEntrances'
import type {
  MazeImportDiagnosticSummary,
  MazeImportPipelineError,
  MazeImportPipelineOptionOverrides,
  MazeImportPipelineProgress,
  MazeImportPipelineResult,
  MazeImportPipelineStage,
  MazeImportPipelineStatus,
  MazeImportPipelineWarning,
  MazeImportStageTiming,
} from './mazeImportPipeline'
import type {
  MazeCell,
  OuterBoundarySide,
  PassageState,
} from './mazeTopology'
import type { OrthogonalGridConversionMetrics } from './orthogonalGridConversion'

export type MazeImportWorkerResultDetail =
  | 'summary'
  | 'preview'
  | 'full'

export interface MazeImportWorkerAnalyzeRequest {
  type: 'analyze'
  requestId: string
  image: ImageMatrix
  options?: MazeImportPipelineOptionOverrides
  resultDetail?: MazeImportWorkerResultDetail
}

export interface MazeImportWorkerCancelRequest {
  type: 'cancel'
  requestId: string
}

export interface MazeImportWorkerPingRequest {
  type: 'ping'
  requestId: string
}

export type MazeImportWorkerRequest =
  | MazeImportWorkerAnalyzeRequest
  | MazeImportWorkerCancelRequest
  | MazeImportWorkerPingRequest

export interface MazeImportWorkerReadyResponse {
  type: 'ready'
  workerGeneration: number
}

export interface MazeImportWorkerStartedResponse {
  type: 'started'
  requestId: string
}

export interface MazeImportWorkerProgressResponse {
  type: 'progress'
  requestId: string
  progress: MazeImportPipelineProgress
}

export interface MazeImportWorkerCompletedResponse {
  type: 'completed'
  requestId: string
  result: MazeImportWorkerResult
}

export interface MazeImportWorkerFailedResponse {
  type: 'failed'
  requestId: string
  error: {
    code: string
    message: string
  }
}

export interface MazeImportWorkerCancelledResponse {
  type: 'cancelled'
  requestId: string
}

export interface MazeImportWorkerPongResponse {
  type: 'pong'
  requestId: string
}

export type MazeImportWorkerResponse =
  | MazeImportWorkerReadyResponse
  | MazeImportWorkerStartedResponse
  | MazeImportWorkerProgressResponse
  | MazeImportWorkerCompletedResponse
  | MazeImportWorkerFailedResponse
  | MazeImportWorkerCancelledResponse
  | MazeImportWorkerPongResponse

export interface OrthogonalMazeDetectionSummary {
  detected: boolean
  rows: number
  columns: number
  confidence: number
  orthogonalityScore: number
  warnings: string[]
}

export interface OrthogonalMazeTopologySummary {
  analyzed: boolean
  rows: number
  columns: number
  confidence: number
  connectedComponents: number
  uncertainBoundaries: number
  warnings: string[]
}

export interface EntranceCandidateSummary {
  id: string
  side: OuterBoundarySide
  startIndex: number
  endIndex: number
  widthInCells: number
  representativeCell: MazeCell
  confidence: number
  state: EntranceCandidateState
  componentId: number | null
  componentSize: number
  warnings: string[]
}

export interface EntranceSelectionSummary {
  status: EntranceSelectionStatus
  automatic: boolean
  confidence: number
  candidateCount: number
  pairCandidateCount: number
  selectedCandidateIds: [string, string] | null
  candidates: EntranceCandidateSummary[]
  warnings: string[]
}

export interface OrthogonalGridConversionSummary {
  success: boolean
  metrics: OrthogonalGridConversionMetrics | null
  startCandidateId: string | null
  goalCandidateId: string | null
  warnings: string[]
  error: {
    code: string
    message: string
  } | null
}

export interface MazeBoundaryPreview {
  from: MazeCell
  to: MazeCell
  state: PassageState
  confidence: number
}

export interface MazeOuterBoundaryPreview {
  side: OuterBoundarySide
  cell: MazeCell
  state: PassageState
  confidence: number
}

export interface MazeImportPreviewData {
  croppedMask: BinaryMask | null
  horizontalLineCenters: number[]
  verticalLineCenters: number[]
  horizontalBoundaries: MazeBoundaryPreview[]
  verticalBoundaries: MazeBoundaryPreview[]
  outerBoundaries: MazeOuterBoundaryPreview[]
  entranceCandidates: EntranceCandidateSummary[]
}

export interface MazeImportWorkerResultBase {
  detail: MazeImportWorkerResultDetail
  status: MazeImportPipelineStatus
  completedStage: MazeImportPipelineStage
  diagnostics: MazeImportDiagnosticSummary
  document: GridMapDocument | null
  detection: OrthogonalMazeDetectionSummary | null
  topology: OrthogonalMazeTopologySummary | null
  entranceSelection: EntranceSelectionSummary | null
  conversion: OrthogonalGridConversionSummary | null
  warnings: MazeImportPipelineWarning[]
  error: MazeImportPipelineError | null
  timings: MazeImportStageTiming[]
  totalDurationMs: number
}

export interface MazeImportWorkerSummaryResult
  extends MazeImportWorkerResultBase {
  detail: 'summary'
}

export interface MazeImportWorkerPreviewResult
  extends MazeImportWorkerResultBase {
  detail: 'preview'
  preview: MazeImportPreviewData
}

export interface MazeImportWorkerFullResult
  extends MazeImportWorkerResultBase {
  detail: 'full'
  fullResult: MazeImportPipelineResult
}

export type MazeImportWorkerResult =
  | MazeImportWorkerSummaryResult
  | MazeImportWorkerPreviewResult
  | MazeImportWorkerFullResult
