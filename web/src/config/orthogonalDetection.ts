import type { OrthogonalDetectionOptions } from '@/types/orthogonalMaze'

export const ORTHOGONAL_DETECTION_DEFAULTS: Readonly<OrthogonalDetectionOptions> = {
  minimumCellSize: 4,
  maximumCellSize: 128,
  minimumCellCount: 2,
  maximumCellCount: 75,
  projectionSmoothingRadius: 1,
  lineBandThresholdRatio: 0.12,
  linePositionTolerance: 2,
  minimumPeriodicityConfidence: 0.45,
  minimumAxisConfidence: 0.5,
  minimumOrthogonalityScore: 0.29,
  minimumOverallConfidence: 0.55,
}

export const ORTHOGONAL_DETECTION_WEIGHTS = {
  projectionWallDensity: 0.35,
  projectionDirectionalEvidence: 0.65,
  pitchMatchedRatio: 0.35,
  pitchCoverageRatio: 0.2,
  pitchProfileEnergy: 0.1,
  pitchInterlineContrast: 0.1,
  pitchPositionAccuracy: 0.1,
  pitchBoundaryCoverage: 0.15,
  axisPeriodicity: 0.4,
  axisPitchConsistency: 0.2,
  axisBoundary: 0.2,
  axisWallThickness: 0.2,
  reconstructionMatches: 0.5,
  reconstructionPitchConsistency: 0.25,
  reconstructionBoundary: 0.25,
} as const

export const ORTHOGONAL_DETECTION_THRESHOLDS = {
  evidenceBalanceFloor: 0.25,
  nonAxisGradientTolerance: 0.28,
  nonAxisGradientRejection: 0.38,
  ambiguousPitchScoreGap: 0.06,
  minimumPitchMatchRatio: 0.55,
  minimumObservedBandCoverage: 0.85,
  minimumBoundaryConfidence: 0.65,
  minimumPitchConsistency: 0.85,
  minimumWallThicknessConfidence: 0.4,
  maximumWallToPitchRatio: 0.65,
  weakLineStrengthRatio: 0.35,
} as const

export const ORTHOGONAL_WARNING_CODES = {
  orthogonalEvidenceLow: 'ORTHOGONAL_EVIDENCE_LOW',
  horizontalGridNotDetected: 'HORIZONTAL_GRID_NOT_DETECTED',
  verticalGridNotDetected: 'VERTICAL_GRID_NOT_DETECTED',
  gridPitchNotFound: 'GRID_PITCH_NOT_FOUND',
  gridPitchAmbiguous: 'GRID_PITCH_AMBIGUOUS',
  gridLineMatchInsufficient: 'GRID_LINE_MATCH_INSUFFICIENT',
  gridBoundaryLowConfidence: 'GRID_BOUNDARY_LOW_CONFIDENCE',
  gridWallThicknessInvalid: 'GRID_WALL_THICKNESS_INVALID',
  gridCellCountOutOfRange: 'GRID_CELL_COUNT_OUT_OF_RANGE',
  orthogonalConfidenceLow: 'ORTHOGONAL_CONFIDENCE_LOW',
} as const
