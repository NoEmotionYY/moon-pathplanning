import { IMAGE_ANALYSIS_THRESHOLDS } from '@/config/imageAnalysis'
import type {
  BinaryMask,
  GrayscaleImage,
  MaskStatistics,
  WallPolarityAnalysis,
} from '@/types/imageAnalysis'
import {
  assertBinaryMask,
  assertGrayscaleImage,
} from './imageDataValidation'

export function createWallMask(
  grayscale: GrayscaleImage,
  analysis: WallPolarityAnalysis,
): BinaryMask {
  assertGrayscaleImage(grayscale)
  const values = new Uint8Array(grayscale.values.length)
  const darkWalls = analysis.polarity === 'dark-on-light'

  for (let index = 0; index < grayscale.values.length; index += 1) {
    const luminance = grayscale.values[index] ?? 0
    values[index] = darkWalls
      ? Number(luminance <= analysis.threshold)
      : Number(luminance >= analysis.threshold)
  }

  return {
    width: grayscale.width,
    height: grayscale.height,
    values,
  }
}

export function calculateMaskStatistics(
  mask: BinaryMask,
): MaskStatistics {
  assertBinaryMask(mask)
  let wallPixels = 0
  for (const value of mask.values) wallPixels += value === 1 ? 1 : 0
  const freePixels = mask.values.length - wallPixels
  const wallRatio = wallPixels / mask.values.length
  const warnings: string[] = []
  if (wallRatio <= IMAGE_ANALYSIS_THRESHOLDS.maskNearEmptyRatio) {
    warnings.push('墙体蒙版中的墙体比例接近 0。')
  }
  if (wallRatio >= IMAGE_ANALYSIS_THRESHOLDS.maskNearFullRatio) {
    warnings.push('墙体蒙版中的墙体比例接近 1。')
  }
  return { wallPixels, freePixels, wallRatio, warnings }
}
