import {
  ORTHOGONAL_WARNING_CODES,
} from '@/config/orthogonalDetection'
import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type {
  OrthogonalDetectionOptions,
  OrthogonalMazeDetection,
} from '@/types/orthogonalMaze'
import { detectAxisGrid, resolveOrthogonalDetectionOptions } from './axisGridDetector'
import {
  assertBinaryMask,
  assertIntegralImage,
} from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'
import { calculateOrientationEvidence } from './orientationEvidence'
import {
  buildHorizontalProjection,
  buildVerticalProjection,
} from './wallProjection'

const unique = (...groups: string[][]): string[] =>
  [...new Set(groups.flat())]

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export function calculateOrthogonalityGate(
  orthogonalityScore: number,
  minimumOrthogonalityScore: number,
): number {
  if (orthogonalityScore <= minimumOrthogonalityScore) {
    return 0
  }
  // 当前方向证据在最低门槛的两倍处已经代表充分正交。
  const normalized = clamp01(
    (orthogonalityScore - minimumOrthogonalityScore) /
      minimumOrthogonalityScore,
  )
  return normalized * normalized * (3 - 2 * normalized)
}

export function detectOrthogonalMaze(
  mask: BinaryMask,
  integral?: IntegralImage,
  options: Partial<OrthogonalDetectionOptions> = {},
): OrthogonalMazeDetection {
  assertBinaryMask(mask)
  if (integral) {
    assertIntegralImage(integral)
    if (integral.width !== mask.width || integral.height !== mask.height) {
      throw new MazeImageProcessingError(
        'IMAGE_PIXEL_DATA_INVALID',
        '积分图尺寸必须与墙体掩码一致。',
      )
    }
  }
  const resolved = resolveOrthogonalDetectionOptions(options)
  const evidence = calculateOrientationEvidence(mask)
  const horizontalProfile = buildHorizontalProjection(mask, evidence)
  const verticalProfile = buildVerticalProjection(mask, evidence)
  const horizontal = detectAxisGrid(
    'horizontal',
    horizontalProfile,
    mask.height,
    resolved,
  )
  const vertical = detectAxisGrid(
    'vertical',
    verticalProfile,
    mask.width,
    resolved,
  )
  const ownWarnings: string[] = []
  if (
    evidence.orthogonalityScore <
      resolved.minimumOrthogonalityScore
  ) {
    ownWarnings.push(ORTHOGONAL_WARNING_CODES.orthogonalEvidenceLow)
  }
  if (!horizontal.detected) {
    ownWarnings.push(ORTHOGONAL_WARNING_CODES.horizontalGridNotDetected)
  }
  if (!vertical.detected) {
    ownWarnings.push(ORTHOGONAL_WARNING_CODES.verticalGridNotDetected)
  }

  const axisConfidence = Math.sqrt(
    horizontal.confidence * vertical.confidence,
  )
  const orthogonalityGate = calculateOrthogonalityGate(
    evidence.orthogonalityScore,
    resolved.minimumOrthogonalityScore,
  )
  const pitchConsistency = Math.sqrt(
    horizontal.pitchConsistency * vertical.pitchConsistency,
  )
  const boundaryConsistency = Math.sqrt(
    horizontal.boundaryConfidence * vertical.boundaryConfidence,
  )
  const rows = horizontal.cellCount
  const columns = vertical.cellCount
  const validCellCounts =
    rows >= resolved.minimumCellCount &&
    rows <= resolved.maximumCellCount &&
    columns >= resolved.minimumCellCount &&
    columns <= resolved.maximumCellCount
  const structuralConsistency =
    Math.sqrt(pitchConsistency * boundaryConsistency) *
    (validCellCounts ? 1 : 0)
  const confidence = clamp01(
    axisConfidence * orthogonalityGate * structuralConsistency,
  )
  const detected =
    horizontal.detected &&
    vertical.detected &&
    validCellCounts &&
    evidence.orthogonalityScore >=
      resolved.minimumOrthogonalityScore &&
    confidence >= resolved.minimumOverallConfidence
  if (!detected && confidence < resolved.minimumOverallConfidence) {
    ownWarnings.push(ORTHOGONAL_WARNING_CODES.orthogonalConfidenceLow)
  }

  return {
    detected,
    rows,
    columns,
    horizontal,
    vertical,
    orthogonalityScore: evidence.orthogonalityScore,
    confidence,
    warnings: unique(horizontal.warnings, vertical.warnings, ownWarnings),
  }
}
