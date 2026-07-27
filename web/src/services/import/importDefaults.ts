import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import { IMAGE_ANALYSIS_DEFAULTS } from '@/config/imageAnalysis'
import type { MazePreprocessOptions } from '@/types/imageAnalysis'
import type { MazeImportOptions } from '@/types/import'

export const DEFAULT_MAZE_IMPORT_OPTIONS: Readonly<MazeImportOptions> = Object.freeze({
  mode: 'auto',
  targetWidth: MAP_SIZE_LIMITS.recommendedMax,
  targetHeight: MAP_SIZE_LIMITS.recommendedMax,
  wallThreshold: 0.5,
  wallInflation: 0,
  denoiseLevel: 1,
  cropMargin: 0,
  invert: false,
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
  solutionHandling: 'ignore',
})

export const createDefaultMazeImportOptions = (): MazeImportOptions => ({
  ...DEFAULT_MAZE_IMPORT_OPTIONS,
})

export const DEFAULT_MAZE_PREPROCESS_OPTIONS: Readonly<
  Omit<MazePreprocessOptions, 'wallThreshold'>
> = Object.freeze({
  cropMargin: IMAGE_ANALYSIS_DEFAULTS.cropMargin,
  transparentBackground: IMAGE_ANALYSIS_DEFAULTS.transparentBackground,
  minimumAlpha: IMAGE_ANALYSIS_DEFAULTS.minimumAlpha,
  minimumForegroundPixels: IMAGE_ANALYSIS_DEFAULTS.minimumForegroundPixels,
})

export const createDefaultMazePreprocessOptions = (): MazePreprocessOptions => ({
  ...DEFAULT_MAZE_PREPROCESS_OPTIONS,
})
