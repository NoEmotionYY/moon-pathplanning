import {
  ORTHOGONAL_DETECTION_THRESHOLDS,
  ORTHOGONAL_WARNING_CODES,
} from '@/config/orthogonalDetection'
import type { WallBand } from '@/types/orthogonalMaze'

export interface WallThicknessEstimate {
  thickness: number
  consistency: number
  confidence: number
  valid: boolean
  warnings: string[]
}

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function estimateWallThickness(
  bands: WallBand[],
  matchedBands: Array<WallBand | null>,
  pitch?: number,
): WallThicknessEstimate {
  const selected = matchedBands.filter(
    (band): band is WallBand => band !== null,
  )
  const source = selected.length > 0 ? selected : bands
  const thickness = median(source.map((band) => band.thickness))
  if (thickness <= 0) {
    return {
      thickness: 0,
      consistency: 0,
      confidence: 0,
      valid: false,
      warnings: [ORTHOGONAL_WARNING_CODES.gridWallThicknessInvalid],
    }
  }
  const medianDeviation = median(
    source.map((band) => Math.abs(band.thickness - thickness)),
  )
  const consistency = Math.max(0, Math.min(1, 1 - medianDeviation / thickness))
  const ratio = pitch === undefined ? 0 : thickness / pitch
  const valid =
    pitch === undefined ||
    (ratio > 0 &&
      ratio <= ORTHOGONAL_DETECTION_THRESHOLDS.maximumWallToPitchRatio)
  const confidence = valid
    ? consistency *
      Math.min(1, source.length / 3) *
      (pitch === undefined ? 1 : Math.max(0, 1 - ratio))
    : 0
  return {
    thickness,
    consistency,
    confidence,
    valid,
    warnings: valid
      ? []
      : [ORTHOGONAL_WARNING_CODES.gridWallThicknessInvalid],
  }
}
