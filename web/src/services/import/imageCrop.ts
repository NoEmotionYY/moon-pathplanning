import type { BinaryMask } from '@/types/imageAnalysis'
import type { Bounds, ImageMatrix } from '@/types/import'
import {
  assertBinaryMask,
  assertBoundsWithin,
  assertImageMatrix,
} from './imageDataValidation'

export function cropImageMatrix(
  image: ImageMatrix,
  bounds: Bounds,
): ImageMatrix {
  assertImageMatrix(image)
  assertBoundsWithin(
    bounds,
    image.width,
    image.height,
    'CROP_BOUNDS_INVALID',
  )
  const rgba = new Uint8ClampedArray(bounds.width * bounds.height * 4)
  const sourceRowBytes = image.width * 4
  const targetRowBytes = bounds.width * 4
  for (let row = 0; row < bounds.height; row += 1) {
    const sourceStart =
      (bounds.y + row) * sourceRowBytes + bounds.x * 4
    rgba.set(
      image.rgba.subarray(sourceStart, sourceStart + targetRowBytes),
      row * targetRowBytes,
    )
  }
  return { width: bounds.width, height: bounds.height, rgba }
}

export function cropBinaryMask(
  mask: BinaryMask,
  bounds: Bounds,
): BinaryMask {
  assertBinaryMask(mask)
  assertBoundsWithin(
    bounds,
    mask.width,
    mask.height,
    'CROP_BOUNDS_INVALID',
  )
  const values = new Uint8Array(bounds.width * bounds.height)
  for (let row = 0; row < bounds.height; row += 1) {
    const sourceStart = (bounds.y + row) * mask.width + bounds.x
    values.set(
      mask.values.subarray(sourceStart, sourceStart + bounds.width),
      row * bounds.width,
    )
  }
  return { width: bounds.width, height: bounds.height, values }
}
