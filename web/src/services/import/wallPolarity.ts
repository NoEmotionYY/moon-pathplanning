import { IMAGE_ANALYSIS_THRESHOLDS } from '@/config/imageAnalysis'
import type {
  BackgroundEstimate,
  GrayscaleImage,
  WallPolarityAnalysis,
} from '@/types/imageAnalysis'
import { assertGrayscaleImage } from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'

const quantileInRange = (
  histogram: Uint32Array,
  start: number,
  end: number,
  quantile: number,
): number => {
  let total = 0
  for (let value = start; value <= end; value += 1) {
    total += histogram[value] ?? 0
  }
  if (total === 0) return start

  const target = Math.max(1, Math.ceil(total * quantile))
  let cumulative = 0
  for (let value = start; value <= end; value += 1) {
    cumulative += histogram[value] ?? 0
    if (cumulative >= target) return value
  }
  return end
}

export function detectWallPolarity(
  grayscale: GrayscaleImage,
  background: BackgroundEstimate,
  explicitThreshold?: number,
): WallPolarityAnalysis {
  assertGrayscaleImage(grayscale)
  if (
    explicitThreshold !== undefined &&
    (
      !Number.isFinite(explicitThreshold) ||
      explicitThreshold < 0 ||
      explicitThreshold > 255
    )
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '墙体亮度阈值必须在 0～255 之间。',
    )
  }

  const {
    polarityMinimumContrast,
    polarityFullConfidenceContrast,
    polarityLowConfidence,
    polarityEvidenceRatio,
    polarityBackgroundConfidenceFloor,
    darkWallCoreQuantile,
    lightWallCoreQuantile,
  } = IMAGE_ANALYSIS_THRESHOLDS
  const histogram = new Uint32Array(256)
  for (const value of grayscale.values) {
    histogram[value] = (histogram[value] ?? 0) + 1
  }

  const polarity = background.isLight
    ? 'dark-on-light'
    : 'light-on-dark'
  const boundary = background.isLight
    ? Math.max(0, Math.floor(background.luminance - polarityMinimumContrast))
    : Math.min(255, Math.ceil(background.luminance + polarityMinimumContrast))
  let candidatePixels = 0
  if (polarity === 'dark-on-light') {
    for (let value = 0; value <= boundary; value += 1) {
      candidatePixels += histogram[value] ?? 0
    }
  } else {
    for (let value = boundary; value <= 255; value += 1) {
      candidatePixels += histogram[value] ?? 0
    }
  }

  const wallLuminanceEstimate = candidatePixels === 0
    ? background.luminance
    : polarity === 'dark-on-light'
      ? quantileInRange(histogram, 0, boundary, darkWallCoreQuantile)
      : quantileInRange(histogram, boundary, 255, lightWallCoreQuantile)
  const contrast = Math.abs(
    background.luminance - wallLuminanceEstimate,
  )
  const evidence = Math.min(
    1,
    candidatePixels /
      Math.max(1, grayscale.values.length * polarityEvidenceRatio),
  )
  const contrastScore = Math.min(
    1,
    contrast / polarityFullConfidenceContrast,
  )
  const backgroundFactor =
    polarityBackgroundConfidenceFloor +
    (1 - polarityBackgroundConfidenceFloor) * background.confidence
  const confidence = Math.min(
    1,
    contrastScore * evidence * backgroundFactor,
  )
  const automaticThreshold = Math.round(
    (background.luminance + wallLuminanceEstimate) / 2,
  )
  const threshold = explicitThreshold === undefined
    ? automaticThreshold
    : Math.round(explicitThreshold)
  const warnings: string[] = []
  if (confidence < polarityLowConfidence) {
    warnings.push('墙体与背景亮度分离不足，墙体极性置信度较低。')
  }

  return {
    polarity,
    confidence,
    backgroundLuminance: background.luminance,
    wallLuminanceEstimate,
    threshold,
    warnings,
  }
}
