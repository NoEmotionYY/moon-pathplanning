export type ImageProcessingErrorCode =
  | 'IMAGE_DIMENSIONS_INVALID'
  | 'IMAGE_PIXEL_DATA_INVALID'
  | 'BACKGROUND_UNDETERMINED'
  | 'WALL_POLARITY_LOW_CONFIDENCE'
  | 'WALL_MASK_EMPTY'
  | 'WALL_MASK_FULL'
  | 'MAZE_CONTENT_NOT_FOUND'
  | 'CROP_BOUNDS_INVALID'
  | 'INTEGRAL_REGION_OUT_OF_BOUNDS'

export const IMAGE_PROCESSING_CODES = {
  invalidDimensions: 'IMAGE_DIMENSIONS_INVALID',
  invalidPixels: 'IMAGE_PIXEL_DATA_INVALID',
  backgroundUndetermined: 'BACKGROUND_UNDETERMINED',
  lowPolarityConfidence: 'WALL_POLARITY_LOW_CONFIDENCE',
  emptyMask: 'WALL_MASK_EMPTY',
  fullMask: 'WALL_MASK_FULL',
  contentNotFound: 'MAZE_CONTENT_NOT_FOUND',
  invalidCrop: 'CROP_BOUNDS_INVALID',
  integralOutOfBounds: 'INTEGRAL_REGION_OUT_OF_BOUNDS',
} as const satisfies Record<string, ImageProcessingErrorCode>

export class MazeImageProcessingError extends Error {
  constructor(
    public readonly code: ImageProcessingErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'MazeImageProcessingError'
  }
}
