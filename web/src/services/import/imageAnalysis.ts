import { IMAGE_ANALYSIS_DEFAULTS } from '@/config/imageAnalysis'
import type {
  BackgroundEstimate,
  GrayscaleImage,
  TransparentBackgroundMode,
} from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import { estimateBackground } from './backgroundEstimator'
import { assertImageMatrix } from './imageDataValidation'
import { calculateLuminance } from './luminance'

export { calculateLuminance } from './luminance'

export interface GrayscaleOptions {
  transparentBackground?: TransparentBackgroundMode
  minimumAlpha?: number
  backgroundEstimate?: BackgroundEstimate
}

export function createGrayscaleImage(
  image: ImageMatrix,
  options: GrayscaleOptions = {},
): GrayscaleImage {
  assertImageMatrix(image)
  const minimumAlpha = options.minimumAlpha ??
    IMAGE_ANALYSIS_DEFAULTS.minimumAlpha
  if (
    !Number.isFinite(minimumAlpha) ||
    minimumAlpha < 0 ||
    minimumAlpha > 255
  ) {
    throw new RangeError('minimumAlpha 必须在 0～255 之间。')
  }

  const mode = options.transparentBackground ??
    IMAGE_ANALYSIS_DEFAULTS.transparentBackground
  const background = mode === 'auto'
    ? options.backgroundEstimate ?? estimateBackground(image)
    : null
  const backgroundLuminance = mode === 'light'
    ? 255
    : mode === 'dark'
      ? 0
      : background?.isLight
        ? 255
        : 0
  const warnings = background?.warnings ? [...background.warnings] : []
  const values = new Uint8Array(image.width * image.height)

  for (let pixel = 0; pixel < values.length; pixel += 1) {
    const offset = pixel * 4
    const alphaByte = image.rgba[offset + 3] ?? 0
    if (alphaByte < minimumAlpha) {
      values[pixel] = backgroundLuminance
      continue
    }
    const alpha = alphaByte / 255
    const sourceLuminance = calculateLuminance(
      image.rgba[offset] ?? 0,
      image.rgba[offset + 1] ?? 0,
      image.rgba[offset + 2] ?? 0,
    )
    // 明确采用 source × alpha + background × (1 - alpha) 合成。
    values[pixel] = Math.round(
      sourceLuminance * alpha + backgroundLuminance * (1 - alpha),
    )
  }

  return {
    width: image.width,
    height: image.height,
    values,
    warnings,
  }
}
