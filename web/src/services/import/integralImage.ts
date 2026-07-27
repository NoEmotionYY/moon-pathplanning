import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type { Bounds } from '@/types/import'
import {
  assertBinaryMask,
  assertBoundsWithin,
  assertIntegralImage,
} from './imageDataValidation'

export function buildIntegralImage(mask: BinaryMask): IntegralImage {
  assertBinaryMask(mask)
  const stride = mask.width + 1
  const values = new Uint32Array(stride * (mask.height + 1))

  for (let y = 0; y < mask.height; y += 1) {
    let rowSum = 0
    const sourceRow = y * mask.width
    const targetRow = (y + 1) * stride
    const previousRow = y * stride
    for (let x = 0; x < mask.width; x += 1) {
      rowSum += (mask.values[sourceRow + x] ?? 0) === 1 ? 1 : 0
      values[targetRow + x + 1] =
        (values[previousRow + x + 1] ?? 0) + rowSum
    }
  }

  return {
    width: mask.width,
    height: mask.height,
    stride,
    values,
  }
}

export function queryIntegralRegion(
  integral: IntegralImage,
  bounds: Bounds,
): number {
  assertIntegralImage(integral)
  assertBoundsWithin(
    bounds,
    integral.width,
    integral.height,
    'INTEGRAL_REGION_OUT_OF_BOUNDS',
  )

  // 查询采用半开区间 [x, x + width) × [y, y + height)。
  const x1 = bounds.x
  const y1 = bounds.y
  const x2 = bounds.x + bounds.width
  const y2 = bounds.y + bounds.height
  const { stride, values } = integral
  return (
    (values[y2 * stride + x2] ?? 0) -
    (values[y1 * stride + x2] ?? 0) -
    (values[y2 * stride + x1] ?? 0) +
    (values[y1 * stride + x1] ?? 0)
  )
}
