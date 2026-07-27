import {
  ORTHOGONAL_DETECTION_DEFAULTS,
  ORTHOGONAL_DETECTION_THRESHOLDS,
  ORTHOGONAL_DETECTION_WEIGHTS,
  ORTHOGONAL_WARNING_CODES,
} from '@/config/orthogonalDetection'
import type {
  AxisGridEstimate,
  DetectionAxis,
  OrthogonalDetectionOptions,
  ProjectionProfile,
} from '@/types/orthogonalMaze'
import { MazeImageProcessingError } from './imageProcessingError'
import { detectWallBands } from './wallBandDetector'
import {
  detectGridPitchCandidates,
  selectGridPitch,
} from './gridPitchDetector'
import { reconstructGridLines } from './gridLineReconstructor'
import { estimateWallThickness } from './wallThicknessEstimator'
import { smoothProjection } from './wallProjection'

const unique = (values: string[]): string[] => [...new Set(values)]

const emptyEstimate = (
  axis: DetectionAxis,
  warnings: string[],
): AxisGridEstimate => ({
  axis,
  detected: false,
  pitch: 0,
  offset: 0,
  cellCount: 0,
  lineCenters: [],
  lineBands: [],
  wallThickness: 0,
  pitchConsistency: 0,
  boundaryConfidence: 0,
  periodicityConfidence: 0,
  confidence: 0,
  warnings: unique(warnings),
})

export function resolveOrthogonalDetectionOptions(
  options: Partial<OrthogonalDetectionOptions> = {},
): OrthogonalDetectionOptions {
  return { ...ORTHOGONAL_DETECTION_DEFAULTS, ...options }
}

export function detectAxisGrid(
  axis: DetectionAxis,
  profile: ProjectionProfile,
  axisLength: number,
  options: Partial<OrthogonalDetectionOptions> = {},
): AxisGridEstimate {
  if (
    profile.axis !== axis ||
    profile.length !== axisLength ||
    profile.values.length !== axisLength ||
    profile.smoothedValues.length !== axisLength
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '投影轴、长度与投影数组必须保持一致。',
    )
  }
  const resolved = resolveOrthogonalDetectionOptions(options)
  const smoothedValues = smoothProjection(
    profile.values,
    resolved.projectionSmoothingRadius,
  )
  let maximum = 0
  let total = 0
  for (const value of smoothedValues) {
    maximum = Math.max(maximum, value)
    total += value
  }
  const analyzedProfile: ProjectionProfile = {
    ...profile,
    smoothedValues,
    maximum,
    mean: axisLength > 0 ? total / axisLength : 0,
  }
  const bands = detectWallBands(analyzedProfile, resolved)
  if (bands.length < resolved.minimumCellCount + 1) {
    return emptyEstimate(axis, [
      ORTHOGONAL_WARNING_CODES.gridLineMatchInsufficient,
      ORTHOGONAL_WARNING_CODES.gridPitchNotFound,
    ])
  }
  const candidates = detectGridPitchCandidates(analyzedProfile, bands, resolved)
  const candidate = selectGridPitch(candidates)
  const warnings: string[] = []

  if (!candidate) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridPitchNotFound)
    return emptyEstimate(axis, warnings)
  }

  const alternate = candidates.find((item) => item.pitch !== candidate.pitch)
  if (
    alternate &&
    candidate.score - alternate.score <=
      ORTHOGONAL_DETECTION_THRESHOLDS.ambiguousPitchScoreGap
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridPitchAmbiguous)
  }
  if (candidate.score < resolved.minimumPeriodicityConfidence) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridPitchAmbiguous)
  }

  const reconstruction = reconstructGridLines(
    axisLength,
    candidate,
    analyzedProfile,
    bands,
    resolved,
  )
  const cellCount = reconstruction.lineCenters.length - 1
  const matchRatio = reconstruction.expectedLines > 0
    ? reconstruction.matchedLines / reconstruction.expectedLines
    : 0
  const matchedBandCoverage = bands.length > 0
    ? new Set(
        reconstruction.matchedBands.filter((band) => band !== null),
      ).size / bands.length
    : 0
  if (
    matchRatio < ORTHOGONAL_DETECTION_THRESHOLDS.minimumPitchMatchRatio ||
    matchedBandCoverage <
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumObservedBandCoverage
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridLineMatchInsufficient)
  }
  if (
    reconstruction.boundaryConfidence <
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumBoundaryConfidence
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridBoundaryLowConfidence)
  }
  if (
    reconstruction.pitchConsistency <
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumPitchConsistency
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridPitchAmbiguous)
  }
  if (
    cellCount < resolved.minimumCellCount ||
    cellCount > resolved.maximumCellCount
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridCellCountOutOfRange)
  }

  const wallThickness = estimateWallThickness(
    bands,
    reconstruction.matchedBands,
    candidate.pitch,
  )
  if (
    !wallThickness.valid ||
    wallThickness.confidence <
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumWallThicknessConfidence
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridWallThicknessInvalid)
  }

  const confidence =
    candidate.score * ORTHOGONAL_DETECTION_WEIGHTS.axisPeriodicity +
    reconstruction.pitchConsistency *
      ORTHOGONAL_DETECTION_WEIGHTS.axisPitchConsistency +
    reconstruction.boundaryConfidence *
      ORTHOGONAL_DETECTION_WEIGHTS.axisBoundary +
    wallThickness.confidence *
      ORTHOGONAL_DETECTION_WEIGHTS.axisWallThickness
  const detected =
    confidence >= resolved.minimumAxisConfidence &&
    candidate.score >= resolved.minimumPeriodicityConfidence &&
    matchRatio >= ORTHOGONAL_DETECTION_THRESHOLDS.minimumPitchMatchRatio &&
    matchedBandCoverage >=
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumObservedBandCoverage &&
    reconstruction.pitchConsistency >=
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumPitchConsistency &&
    reconstruction.boundaryConfidence >=
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumBoundaryConfidence &&
    cellCount >= resolved.minimumCellCount &&
    cellCount <= resolved.maximumCellCount &&
    wallThickness.valid

  const result: AxisGridEstimate = {
    axis,
    detected,
    pitch: candidate.pitch,
    offset: candidate.offset,
    cellCount,
    lineCenters: reconstruction.lineCenters,
    lineBands: reconstruction.matchedBands.filter((band) => band !== null),
    wallThickness: wallThickness.thickness,
    pitchConsistency: reconstruction.pitchConsistency,
    boundaryConfidence: reconstruction.boundaryConfidence,
    periodicityConfidence: candidate.score,
    confidence,
    warnings: unique(warnings),
  }
  return detected
    ? result
    : {
        ...result,
        cellCount: 0,
        lineCenters: [],
        lineBands: [],
      }
}
