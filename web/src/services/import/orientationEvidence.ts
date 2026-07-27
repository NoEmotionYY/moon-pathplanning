import {
  ORTHOGONAL_DETECTION_THRESHOLDS,
} from '@/config/orthogonalDetection'
import type { BinaryMask } from '@/types/imageAnalysis'
import type { OrientationEvidence } from '@/types/orthogonalMaze'
import { assertBinaryMask } from './imageDataValidation'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const sample = (
  values: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number =>
  x >= 0 && x < width && y >= 0 && y < height
    ? (values[y * width + x] ?? 0)
    : 0

const calculateNonAxisGradientScore = (
  values: Uint8Array,
  width: number,
  height: number,
): number => {
  let diagonalEnergy = 0
  let boundaryEnergy = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const topLeft = sample(values, width, height, x - 1, y - 1)
      const top = sample(values, width, height, x, y - 1)
      const topRight = sample(values, width, height, x + 1, y - 1)
      const left = sample(values, width, height, x - 1, y)
      const right = sample(values, width, height, x + 1, y)
      const bottomLeft = sample(values, width, height, x - 1, y + 1)
      const bottom = sample(values, width, height, x, y + 1)
      const bottomRight = sample(values, width, height, x + 1, y + 1)
      const gradientX = Math.abs(
        topRight + 2 * right + bottomRight -
        topLeft - 2 * left - bottomLeft,
      )
      const gradientY = Math.abs(
        bottomLeft + 2 * bottom + bottomRight -
        topLeft - 2 * top - topRight,
      )
      boundaryEnergy += Math.max(gradientX, gradientY)
      diagonalEnergy += Math.min(gradientX, gradientY)
    }
  }
  return boundaryEnergy === 0 ? 0 : diagonalEnergy / boundaryEnergy
}

export function calculateOrientationEvidence(
  mask: BinaryMask,
): OrientationEvidence {
  assertBinaryMask(mask)
  const { width, height, values } = mask
  const horizontal = new Float64Array(values.length)
  const vertical = new Float64Array(values.length)
  let horizontalSum = 0
  let verticalSum = 0
  let wallPixels = 0

  for (let y = 0; y < height; y += 1) {
    const row = y * width
    for (let x = 0; x < width; x += 1) {
      const index = row + x
      if (values[index] !== 1) {
        continue
      }
      wallPixels += 1
      const left = x > 0 ? (values[index - 1] ?? 0) : 0
      const right = x + 1 < width ? (values[index + 1] ?? 0) : 0
      const up = y > 0 ? (values[index - width] ?? 0) : 0
      const down = y + 1 < height ? (values[index + width] ?? 0) : 0
      const horizontalValue = (left + right) / 2
      const verticalValue = (up + down) / 2
      horizontal[index] = horizontalValue
      vertical[index] = verticalValue
      horizontalSum += horizontalValue
      verticalSum += verticalValue
    }
  }

  if (wallPixels === 0) {
    return {
      width,
      height,
      horizontal,
      vertical,
      horizontalEnergy: 0,
      verticalEnergy: 0,
      horizontalScore: 0,
      verticalScore: 0,
      nonAxisScore: 0,
      orthogonalityScore: 0,
    }
  }

  const horizontalScore = horizontalSum / wallPixels
  const verticalScore = verticalSum / wallPixels
  const maximum = Math.max(horizontalScore, verticalScore)
  const balance = maximum === 0
    ? 0
    : Math.min(horizontalScore, verticalScore) / maximum
  const balanceFactor =
    ORTHOGONAL_DETECTION_THRESHOLDS.evidenceBalanceFloor +
    (1 - ORTHOGONAL_DETECTION_THRESHOLDS.evidenceBalanceFloor) * balance
  const continuity = (horizontalScore + verticalScore) / 2
  const nonAxisScore = calculateNonAxisGradientScore(values, width, height)
  const nonAxisRange =
    ORTHOGONAL_DETECTION_THRESHOLDS.nonAxisGradientRejection -
    ORTHOGONAL_DETECTION_THRESHOLDS.nonAxisGradientTolerance
  const nonAxisPenalty = 1 - clamp01(
    (nonAxisScore -
      ORTHOGONAL_DETECTION_THRESHOLDS.nonAxisGradientTolerance) /
      nonAxisRange,
  )

  return {
    width,
    height,
    horizontal,
    vertical,
    horizontalEnergy: horizontalScore,
    verticalEnergy: verticalScore,
    horizontalScore,
    verticalScore,
    nonAxisScore,
    orthogonalityScore: clamp01(
      continuity * balanceFactor * nonAxisPenalty,
    ),
  }
}
