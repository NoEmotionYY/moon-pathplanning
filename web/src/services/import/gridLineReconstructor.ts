import {
  ORTHOGONAL_DETECTION_THRESHOLDS,
  ORTHOGONAL_DETECTION_WEIGHTS,
  ORTHOGONAL_WARNING_CODES,
} from '@/config/orthogonalDetection'
import type {
  GridPitchCandidate,
  OrthogonalDetectionOptions,
  ProjectionProfile,
  WallBand,
} from '@/types/orthogonalMaze'

export interface ReconstructedGridLines {
  lineCenters: number[]
  matchedBands: Array<WallBand | null>
  matchedLines: number
  expectedLines: number
  meanPositionError: number
  boundaryConfidence: number
  pitchConsistency: number
  confidence: number
  warnings: string[]
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const nearestBand = (
  position: number,
  bands: WallBand[],
  tolerance: number,
): WallBand | undefined => {
  let nearest: WallBand | undefined
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const band of bands) {
    const distance = Math.abs(band.center - position)
    const allowed = tolerance + Math.max(0, band.thickness - 1) / 2
    if (distance <= allowed && distance < nearestDistance) {
      nearest = band
      nearestDistance = distance
    }
  }
  return nearest
}

export function reconstructGridLines(
  axisLength: number,
  candidate: GridPitchCandidate,
  profile: ProjectionProfile,
  bands: WallBand[],
  options: OrthogonalDetectionOptions,
): ReconstructedGridLines {
  const tolerance = options.linePositionTolerance
  const centers: number[] = []
  const matchedBands: Array<WallBand | null> = []
  let positionError = 0

  for (
    let theoretical = candidate.offset;
    theoretical < axisLength;
    theoretical += candidate.pitch
  ) {
    const band = nearestBand(theoretical, bands, tolerance)
    const center = band ? band.center : theoretical
    const previous = centers.at(-1)
    if (previous !== undefined && previous >= axisLength - 1) {
      break
    }
    const safeCenter = previous === undefined
      ? Math.max(0, Math.min(profile.length - 1, center))
      : Math.max(
          previous + Number.EPSILON,
          Math.min(axisLength - 1, center),
        )
    centers.push(safeCenter)
    matchedBands.push(band ?? null)
    if (band) {
      positionError += Math.abs(band.center - theoretical)
    }
  }

  let deviation = 0
  for (let index = 1; index < centers.length; index += 1) {
    deviation += Math.abs(
      ((centers[index] ?? 0) - (centers[index - 1] ?? 0)) - candidate.pitch,
    )
  }
  const meanDeviation = centers.length > 1
    ? deviation / (centers.length - 1)
    : candidate.pitch
  const pitchConsistency = clamp01(1 - meanDeviation / candidate.pitch)
  const firstBand = bands[0]
  const lastBand = bands.at(-1)
  const firstCenter = centers[0]
  const lastCenter = centers.at(-1)
  const boundaryConfidence =
    firstBand && lastBand && firstCenter !== undefined && lastCenter !== undefined
      ? (
          clamp01(
            1 -
            Math.abs(firstCenter - firstBand.center) /
              Math.max(1, tolerance + firstBand.thickness / 2),
          ) +
          clamp01(
            1 -
            Math.abs(lastCenter - lastBand.center) /
              Math.max(1, tolerance + lastBand.thickness / 2),
          )
        ) / 2
      : 0
  const matchedLines = matchedBands.filter((band) => band !== null).length
  const matchRatio = centers.length > 0 ? matchedLines / centers.length : 0
  const confidence =
    matchRatio * ORTHOGONAL_DETECTION_WEIGHTS.reconstructionMatches +
    pitchConsistency *
      ORTHOGONAL_DETECTION_WEIGHTS.reconstructionPitchConsistency +
    boundaryConfidence *
      ORTHOGONAL_DETECTION_WEIGHTS.reconstructionBoundary
  const warnings: string[] = []
  if (matchedLines < centers.length) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridLineMatchInsufficient)
  }
  if (
    boundaryConfidence <
      ORTHOGONAL_DETECTION_THRESHOLDS.minimumBoundaryConfidence
  ) {
    warnings.push(ORTHOGONAL_WARNING_CODES.gridBoundaryLowConfidence)
  }

  return {
    lineCenters: centers,
    matchedBands,
    matchedLines,
    expectedLines: centers.length,
    meanPositionError: matchedLines > 0
      ? positionError / matchedLines
      : Number.POSITIVE_INFINITY,
    boundaryConfidence,
    pitchConsistency,
    confidence,
    warnings,
  }
}
