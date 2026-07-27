import {
  ORTHOGONAL_DETECTION_WEIGHTS,
} from '@/config/orthogonalDetection'
import type { BinaryMask } from '@/types/imageAnalysis'
import type {
  DetectionAxis,
  OrientationEvidence,
  ProjectionProfile,
} from '@/types/orthogonalMaze'
import { assertBinaryMask } from './imageDataValidation'
import { calculateOrientationEvidence } from './orientationEvidence'

const summarize = (
  axis: DetectionAxis,
  values: Float64Array,
  smoothedValues: Float64Array,
): ProjectionProfile => {
  let maximum = 0
  let total = 0
  for (const value of smoothedValues) {
    maximum = Math.max(maximum, value)
    total += value
  }
  return {
    axis,
    length: values.length,
    values,
    smoothedValues,
    maximum,
    mean: values.length === 0 ? 0 : total / values.length,
  }
}

export function smoothProjection(
  values: Float64Array,
  radius: number,
): Float64Array {
  const normalizedRadius = Math.max(0, Math.floor(radius))
  if (normalizedRadius === 0 || values.length < 2) {
    return values.slice()
  }

  const prefix = new Float64Array(values.length + 1)
  for (let index = 0; index < values.length; index += 1) {
    prefix[index + 1] = (prefix[index] ?? 0) + (values[index] ?? 0)
  }
  const result = new Float64Array(values.length)
  for (let index = 0; index < values.length; index += 1) {
    const start = Math.max(0, index - normalizedRadius)
    const end = Math.min(values.length, index + normalizedRadius + 1)
    result[index] =
      ((prefix[end] ?? 0) - (prefix[start] ?? 0)) / (end - start)
  }
  return result
}

export function buildWallProjection(
  mask: BinaryMask,
  axis: DetectionAxis,
  evidence: OrientationEvidence = calculateOrientationEvidence(mask),
  smoothingRadius = 0,
): ProjectionProfile {
  assertBinaryMask(mask)
  const length = axis === 'horizontal' ? mask.height : mask.width
  const crossLength = axis === 'horizontal' ? mask.width : mask.height
  const values = new Float64Array(length)
  const directional = axis === 'horizontal'
    ? evidence.horizontal
    : evidence.vertical

  for (let y = 0; y < mask.height; y += 1) {
    const row = y * mask.width
    for (let x = 0; x < mask.width; x += 1) {
      const index = row + x
      const projectionIndex = axis === 'horizontal' ? y : x
      values[projectionIndex] =
        (values[projectionIndex] ?? 0) +
        ORTHOGONAL_DETECTION_WEIGHTS.projectionWallDensity *
          (mask.values[index] ?? 0) +
        ORTHOGONAL_DETECTION_WEIGHTS.projectionDirectionalEvidence *
          (directional[index] ?? 0)
    }
  }

  for (let index = 0; index < length; index += 1) {
    values[index] = (values[index] ?? 0) / crossLength
  }
  const smoothedValues = smoothProjection(values, smoothingRadius)
  return summarize(axis, values, smoothedValues)
}

export function buildHorizontalProjection(
  mask: BinaryMask,
  evidence: OrientationEvidence,
): ProjectionProfile {
  return buildWallProjection(mask, 'horizontal', evidence)
}

export function buildVerticalProjection(
  mask: BinaryMask,
  evidence: OrientationEvidence,
): ProjectionProfile {
  return buildWallProjection(mask, 'vertical', evidence)
}
