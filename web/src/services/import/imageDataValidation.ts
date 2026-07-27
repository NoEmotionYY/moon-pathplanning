import { IMPORT_IMAGE_LIMITS } from '@/config/importLimits'
import type { BinaryMask, GrayscaleImage, IntegralImage } from '@/types/imageAnalysis'
import type { Bounds, ImageMatrix } from '@/types/import'
import { MazeImageProcessingError } from './imageProcessingError'

const hasValidDimensions = (width: number, height: number): boolean =>
  Number.isInteger(width) &&
  Number.isInteger(height) &&
  width > 0 &&
  height > 0 &&
  width <= IMPORT_IMAGE_LIMITS.maxWidth &&
  height <= IMPORT_IMAGE_LIMITS.maxHeight &&
  width * height <= IMPORT_IMAGE_LIMITS.maxPixels

export const assertImageMatrix = (image: ImageMatrix): void => {
  if (!hasValidDimensions(image.width, image.height)) {
    throw new MazeImageProcessingError(
      'IMAGE_DIMENSIONS_INVALID',
      '图片尺寸无效或超过允许的解码范围。',
    )
  }
  if (
    !(image.rgba instanceof Uint8ClampedArray) ||
    image.rgba.length !== image.width * image.height * 4
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '图片 RGBA 数据长度与尺寸不一致。',
    )
  }
}

export const assertGrayscaleImage = (image: GrayscaleImage): void => {
  if (!hasValidDimensions(image.width, image.height)) {
    throw new MazeImageProcessingError(
      'IMAGE_DIMENSIONS_INVALID',
      '灰度图尺寸无效或超过允许范围。',
    )
  }
  if (
    !(image.values instanceof Uint8Array) ||
    image.values.length !== image.width * image.height
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '灰度图数据长度与尺寸不一致。',
    )
  }
}

export const assertBinaryMask = (mask: BinaryMask): void => {
  if (!hasValidDimensions(mask.width, mask.height)) {
    throw new MazeImageProcessingError(
      'IMAGE_DIMENSIONS_INVALID',
      '墙体蒙版尺寸无效或超过允许范围。',
    )
  }
  if (
    !(mask.values instanceof Uint8Array) ||
    mask.values.length !== mask.width * mask.height
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '墙体蒙版数据长度与尺寸不一致。',
    )
  }
  for (const value of mask.values) {
    if (value > 1) {
      throw new MazeImageProcessingError(
        'IMAGE_PIXEL_DATA_INVALID',
        '墙体蒙版只能包含 0（非墙体）或 1（墙体）。',
      )
    }
  }
}

export const assertBoundsWithin = (
  bounds: Bounds,
  width: number,
  height: number,
  code: 'CROP_BOUNDS_INVALID' | 'INTEGRAL_REGION_OUT_OF_BOUNDS',
): void => {
  const valid =
    Number.isInteger(bounds.x) &&
    Number.isInteger(bounds.y) &&
    Number.isInteger(bounds.width) &&
    Number.isInteger(bounds.height) &&
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.x + bounds.width <= width &&
    bounds.y + bounds.height <= height
  if (!valid) {
    throw new MazeImageProcessingError(
      code,
      code === 'CROP_BOUNDS_INVALID'
        ? '裁剪区域必须为图片范围内的非空整数矩形。'
        : '积分图查询区域超出有效范围。',
    )
  }
}

export const assertIntegralImage = (integral: IntegralImage): void => {
  const valid =
    hasValidDimensions(integral.width, integral.height) &&
    integral.stride === integral.width + 1 &&
    integral.values instanceof Uint32Array &&
    integral.values.length ===
      (integral.width + 1) * (integral.height + 1)
  if (!valid) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '积分图数据结构无效。',
    )
  }
}
