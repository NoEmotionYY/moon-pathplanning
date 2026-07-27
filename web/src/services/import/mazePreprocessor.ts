import type {
  MazePreprocessOptions,
  MazePreprocessResult,
} from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import {
  createDefaultMazePreprocessOptions,
} from './importDefaults'
import { estimateBackground } from './backgroundEstimator'
import { createGrayscaleImage } from './imageAnalysis'
import { detectWallPolarity } from './wallPolarity'
import {
  calculateMaskStatistics,
  createWallMask,
} from './wallMask'
import { detectContentBounds } from './cropDetector'
import { cropBinaryMask, cropImageMatrix } from './imageCrop'
import { buildIntegralImage } from './integralImage'
import { assertImageMatrix } from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'

const uniqueWarnings = (...groups: string[][]): string[] =>
  [...new Set(groups.flat())]

export function preprocessMazeImage(
  image: ImageMatrix,
  options: Partial<MazePreprocessOptions> = {},
): MazePreprocessResult {
  assertImageMatrix(image)
  const resolved: MazePreprocessOptions = {
    ...createDefaultMazePreprocessOptions(),
    ...options,
  }

  const background = estimateBackground(image)
  const grayscale = createGrayscaleImage(image, {
    transparentBackground: resolved.transparentBackground,
    minimumAlpha: resolved.minimumAlpha,
    backgroundEstimate: background,
  })
  const polarity = detectWallPolarity(
    grayscale,
    background,
    resolved.wallThreshold,
  )
  const wallMask = createWallMask(grayscale, polarity)
  const statistics = calculateMaskStatistics(wallMask)
  if (statistics.wallPixels === 0) {
    throw new MazeImageProcessingError(
      'WALL_MASK_EMPTY',
      '墙体蒙版为空，图片中没有可用的墙体候选。',
    )
  }
  if (statistics.freePixels === 0) {
    throw new MazeImageProcessingError(
      'WALL_MASK_FULL',
      '墙体蒙版覆盖整张图片，无法区分墙体与背景。',
    )
  }

  const content = detectContentBounds(wallMask, {
    margin: resolved.cropMargin,
    minimumForegroundPixels: resolved.minimumForegroundPixels,
  })
  if (!content.found) {
    throw new MazeImageProcessingError(
      'MAZE_CONTENT_NOT_FOUND',
      '未检测到达到最小支持量的迷宫内容区域。',
    )
  }

  const croppedImage = cropImageMatrix(image, content.bounds)
  const croppedMask = cropBinaryMask(wallMask, content.bounds)
  const integralMask = buildIntegralImage(croppedMask)
  const warnings = uniqueWarnings(
    background.warnings,
    grayscale.warnings,
    polarity.warnings,
    statistics.warnings,
    content.warnings,
  )

  return {
    grayscale,
    wallMask,
    polarity,
    content,
    croppedImage,
    croppedMask,
    integralMask,
    warnings,
  }
}
