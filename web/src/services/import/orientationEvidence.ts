import {
  ORTHOGONAL_DETECTION_THRESHOLDS,
} from '@/config/orthogonalDetection'
import type { BinaryMask } from '@/types/imageAnalysis'
import type { OrientationEvidence } from '@/types/orthogonalMaze'
import { assertBinaryMask } from './imageDataValidation'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

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

  return {
    width,
    height,
    horizontal,
    vertical,
    horizontalEnergy: horizontalScore,
    verticalEnergy: verticalScore,
    horizontalScore,
    verticalScore,
    orthogonalityScore: clamp01(continuity * balanceFactor),
  }
}
