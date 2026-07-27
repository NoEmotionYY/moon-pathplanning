import type { BinaryMask, IntegralImage, MazePreprocessResult } from './imageAnalysis'

export type DetectionAxis = 'horizontal' | 'vertical'

export interface ProjectionProfile {
  axis: DetectionAxis
  length: number
  values: Float64Array
  smoothedValues: Float64Array
  maximum: number
  mean: number
}

export interface WallBand {
  start: number
  end: number
  center: number
  thickness: number
  strength: number
  confidence: number
}

export interface GridPitchCandidate {
  pitch: number
  offset: number
  score: number
  matchedLines: number
  expectedLines: number
  meanPositionError: number
}

export interface AxisGridEstimate {
  axis: DetectionAxis
  detected: boolean
  pitch: number
  offset: number
  cellCount: number
  lineCenters: number[]
  lineBands: WallBand[]
  wallThickness: number
  pitchConsistency: number
  boundaryConfidence: number
  periodicityConfidence: number
  confidence: number
  warnings: string[]
}

export interface OrthogonalMazeDetection {
  detected: boolean
  rows: number
  columns: number
  horizontal: AxisGridEstimate
  vertical: AxisGridEstimate
  orthogonalityScore: number
  confidence: number
  warnings: string[]
}

export interface OrthogonalDetectionOptions {
  minimumCellSize: number
  maximumCellSize: number
  minimumCellCount: number
  maximumCellCount: number
  projectionSmoothingRadius: number
  lineBandThresholdRatio: number
  linePositionTolerance: number
  minimumPeriodicityConfidence: number
  minimumAxisConfidence: number
  minimumOrthogonalityScore: number
  minimumOverallConfidence: number
}

export interface OrientationEvidence {
  width: number
  height: number
  horizontal: Float64Array
  vertical: Float64Array
  horizontalEnergy: number
  verticalEnergy: number
  horizontalScore: number
  verticalScore: number
  nonAxisScore: number
  orthogonalityScore: number
}

export interface MazeStructureAnalysis {
  preprocess: MazePreprocessResult
  orthogonal: OrthogonalMazeDetection
}

export interface AxisGridDetectionInput {
  mask: BinaryMask
  integral?: IntegralImage
}
