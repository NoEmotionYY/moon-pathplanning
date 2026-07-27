import type { EntranceDetectionOptions } from '@/config/entranceDetection'
import type { OrthogonalGridConversionOptions } from '@/config/orthogonalGridConversion'
import type { GridMapDocument } from './grid'
import type { MazePreprocessOptions, MazePreprocessResult } from './imageAnalysis'
import type { ImageMatrix, ImageTransformState } from './import'
import type {
  EntranceSelectionResult,
  EntranceSelectionStatus,
} from './mazeEntrances'
import type { OrthogonalMazeTopology, TopologyDetectionOptions } from './mazeTopology'
import type {
  OrthogonalDetectionOptions,
  OrthogonalMazeDetection,
} from './orthogonalMaze'
import type { OrthogonalGridConversionResult } from './orthogonalGridConversion'

export type MazeImportPipelineStage =
  | 'validation'
  | 'transform'
  | 'preprocess'
  | 'orthogonal-detection'
  | 'topology-analysis'
  | 'entrance-selection'
  | 'grid-conversion'
  | 'document-validation'
  | 'completed'

export type MazeImportPipelineStatus =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'unsupported-topology'
  | 'manual-input-required'

export interface MazeImportStageTiming {
  stage: MazeImportPipelineStage
  durationMs: number
}

export interface MazeImportPipelineWarning {
  code: string
  message: string
  stage: MazeImportPipelineStage
}

export interface MazeImportPipelineError {
  code: string
  message: string
  stage: MazeImportPipelineStage
  cause?: string
}

export interface ManualEntrancePair {
  firstCandidateId: string
  secondCandidateId: string
}

export interface MazeImportPipelineOptions {
  transform: ImageTransformState
  preprocess: MazePreprocessOptions
  orthogonalDetection: OrthogonalDetectionOptions
  topologyDetection: TopologyDetectionOptions
  entranceDetection: EntranceDetectionOptions
  gridConversion: OrthogonalGridConversionOptions
  manualEntrancePair?: ManualEntrancePair
}

export interface MazeImportPipelineOptionOverrides {
  transform?: Partial<ImageTransformState>
  preprocess?: Partial<MazePreprocessOptions>
  orthogonalDetection?: Partial<OrthogonalDetectionOptions>
  topologyDetection?: Partial<TopologyDetectionOptions>
  entranceDetection?: Partial<EntranceDetectionOptions>
  gridConversion?: Partial<OrthogonalGridConversionOptions>
  manualEntrancePair?: ManualEntrancePair
}

export interface MazeImportPipelineProgress {
  stage: MazeImportPipelineStage
  stageIndex: number
  totalStages: number
  progress: number
  message: string
}

export type MazeImportProgressCallback = (
  progress: MazeImportPipelineProgress,
) => void

export interface MazeImportDiagnosticSummary {
  sourceWidth: number
  sourceHeight: number
  transformedWidth: number
  transformedHeight: number
  croppedWidth: number | null
  croppedHeight: number | null
  detectedRows: number | null
  detectedColumns: number | null
  orthogonalConfidence: number | null
  topologyConfidence: number | null
  entranceStatus: EntranceSelectionStatus | null
  entranceCandidateCount: number
  pairCandidateCount: number
  convertedWidth: number | null
  convertedHeight: number | null
  obstacleCount: number | null
  walkableCount: number | null
}

export interface MazeImportPipelineResult {
  status: MazeImportPipelineStatus
  completedStage: MazeImportPipelineStage
  sourceImage: ImageMatrix
  transformedImage: ImageMatrix | null
  preprocess: MazePreprocessResult | null
  orthogonalDetection: OrthogonalMazeDetection | null
  topology: OrthogonalMazeTopology | null
  entranceSelection: EntranceSelectionResult | null
  conversion: OrthogonalGridConversionResult | null
  document: GridMapDocument | null
  warnings: MazeImportPipelineWarning[]
  error: MazeImportPipelineError | null
  timings: MazeImportStageTiming[]
  totalDurationMs: number
  diagnostics: MazeImportDiagnosticSummary
}
