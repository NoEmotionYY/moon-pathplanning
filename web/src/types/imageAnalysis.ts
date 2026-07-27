import type { Bounds, ImageMatrix } from './import'

export type WallPolarity = 'dark-on-light' | 'light-on-dark'

export type TransparentBackgroundMode = 'light' | 'dark' | 'auto'

export interface GrayscaleImage {
  width: number
  height: number
  values: Uint8Array
  warnings: string[]
}

export interface BinaryMask {
  width: number
  height: number
  values: Uint8Array
}

export interface BackgroundEstimate {
  luminance: number
  isLight: boolean
  confidence: number
  sampledPixels: number
  warnings: string[]
}

export interface WallPolarityAnalysis {
  polarity: WallPolarity
  confidence: number
  backgroundLuminance: number
  wallLuminanceEstimate: number
  threshold: number
  warnings: string[]
}

export interface MaskStatistics {
  wallPixels: number
  freePixels: number
  wallRatio: number
  warnings: string[]
}

export interface ContentBoundsResult {
  found: boolean
  bounds: Bounds
  foregroundPixels: number
  confidence: number
  warnings: string[]
}

export interface IntegralImage {
  width: number
  height: number
  stride: number
  values: Uint32Array
}

export interface MazePreprocessOptions {
  /**
   * 0～255 亮度阈值。省略时自动分析；深墙使用 <=，浅墙使用 >=。
   */
  wallThreshold?: number
  cropMargin: number
  transparentBackground: TransparentBackgroundMode
  minimumAlpha: number
  minimumForegroundPixels: number
}

export interface MazePreprocessResult {
  grayscale: GrayscaleImage
  wallMask: BinaryMask
  polarity: WallPolarityAnalysis
  content: ContentBoundsResult
  croppedImage: ImageMatrix
  croppedMask: BinaryMask
  integralMask: IntegralImage
  warnings: string[]
}
