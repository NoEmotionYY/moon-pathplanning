import type { GridMapDocument } from './grid'

export type MazeImportMode =
  | 'auto'
  | 'orthogonal'
  | 'occupancy'

export type ImportedTopology =
  | 'orthogonal-grid'
  | 'raster-occupancy'
  | 'hex-grid'

export type MazeSourceFileType =
  | 'json'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'svg'
  | 'pdf'
  | 'unsupported'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface MazeImportOptions {
  mode: MazeImportMode
  targetWidth: number
  targetHeight: number
  wallThreshold: number
  wallInflation: number
  denoiseLevel: number
  cropMargin: number
  invert: boolean
  rotate: 0 | 90 | 180 | 270
  flipHorizontal: boolean
  flipVertical: boolean
  solutionHandling: 'ignore' | 'preserve' | 'detect-endpoints'
}

export interface MazeAnalysis {
  topology: ImportedTopology
  confidence: number
  sourceWidth: number
  sourceHeight: number
  cropBounds: Bounds
  detectedRows?: number
  detectedColumns?: number
  wallColor: 'dark' | 'light'
  detectedSolution: boolean
  warnings: string[]
}

export interface MazeImportError {
  code: string
  message: string
}

export interface MazeImportResult {
  success: boolean
  topology: ImportedTopology
  map?: GridMapDocument
  analysis?: MazeAnalysis
  warnings: string[]
  error?: MazeImportError
}

export interface ImageMatrix {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export interface DecodedImageMetadata {
  width: number
  height: number
  pixels: number
  mimeType: string
  fileSize: number
  fileName: string
}

export interface DecodedImage {
  matrix: ImageMatrix
  metadata: DecodedImageMetadata
}

export interface ImageTransformState {
  rotation: 0 | 90 | 180 | 270
  flipHorizontal: boolean
  flipVertical: boolean
  invert: boolean
}
