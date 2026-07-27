import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
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
