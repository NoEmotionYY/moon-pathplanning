import {
  IMAGE_ANALYSIS_DEFAULTS,
  IMAGE_ANALYSIS_THRESHOLDS,
} from '@/config/imageAnalysis'
import type { BackgroundEstimate } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import { assertImageMatrix } from './imageDataValidation'
import { calculateLuminance } from './luminance'

const findDominantLuminance = (
  histogram: Uint32Array,
  radius: number,
): { luminance: number; clusterPixels: number } => {
  let bestCenter = 0
  let bestCount = -1
  let rolling = 0

  for (let value = 0; value <= 255; value += 1) {
    if (value === 0) {
      for (let index = 0; index <= radius; index += 1) {
        rolling += histogram[index] ?? 0
      }
    } else {
      const leaving = value - radius - 1
      const entering = value + radius
      if (leaving >= 0) rolling -= histogram[leaving] ?? 0
      if (entering <= 255) rolling += histogram[entering] ?? 0
    }
    if (rolling > bestCount) {
      bestCount = rolling
      bestCenter = value
    }
  }

  let weightedSum = 0
  let weightedCount = 0
  for (
    let value = Math.max(0, bestCenter - radius);
    value <= Math.min(255, bestCenter + radius);
    value += 1
  ) {
    const count = histogram[value] ?? 0
    weightedSum += value * count
    weightedCount += count
  }

  return {
    luminance: weightedCount > 0
      ? Math.round(weightedSum / weightedCount)
      : bestCenter,
    clusterPixels: Math.max(0, bestCount),
  }
}

export function estimateBackground(image: ImageMatrix): BackgroundEstimate {
  assertImageMatrix(image)
  const {
    backgroundBandRatio,
    backgroundBandMin,
    backgroundBandMax,
    backgroundClusterRadius,
    backgroundLightCutoff,
    backgroundLowConfidence,
    backgroundDominanceWeight,
    backgroundCoverageWeight,
  } = IMAGE_ANALYSIS_THRESHOLDS
  const minimumAlpha = IMAGE_ANALYSIS_DEFAULTS.minimumAlpha
  const band = Math.min(
    Math.ceil(Math.min(image.width, image.height) / 2),
    Math.min(
      backgroundBandMax,
      Math.max(
        backgroundBandMin,
        Math.round(Math.min(image.width, image.height) * backgroundBandRatio),
      ),
    ),
  )
  const histogram = new Uint32Array(256)
  let sampledPixels = 0
  let candidatePixels = 0

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (
        x >= band &&
        x < image.width - band &&
        y >= band &&
        y < image.height - band
      ) {
        continue
      }
      candidatePixels += 1
      const offset = (y * image.width + x) * 4
      const alpha = image.rgba[offset + 3] ?? 0
      if (alpha < minimumAlpha) continue
      const luminance = Math.round(calculateLuminance(
        image.rgba[offset] ?? 0,
        image.rgba[offset + 1] ?? 0,
        image.rgba[offset + 2] ?? 0,
      ))
      histogram[luminance] = (histogram[luminance] ?? 0) + 1
      sampledPixels += 1
    }
  }

  if (sampledPixels === 0) {
    return {
      luminance: 255,
      isLight: true,
      confidence: 0,
      sampledPixels: 0,
      warnings: ['图片边缘没有足够的不透明像素，背景默认按浅色处理。'],
    }
  }

  const dominant = findDominantLuminance(
    histogram,
    backgroundClusterRadius,
  )
  const dominance = dominant.clusterPixels / sampledPixels
  const coverage = sampledPixels / Math.max(1, candidatePixels)
  const confidence = Math.min(
    1,
    dominance * backgroundDominanceWeight +
      coverage * backgroundCoverageWeight,
  )
  const warnings: string[] = []
  if (confidence < backgroundLowConfidence) {
    warnings.push('图片边缘颜色分散，背景亮度估计置信度较低。')
  }

  return {
    luminance: dominant.luminance,
    isLight: dominant.luminance >= backgroundLightCutoff,
    confidence,
    sampledPixels,
    warnings,
  }
}
