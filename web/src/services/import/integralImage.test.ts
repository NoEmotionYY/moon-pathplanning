import { IMPORT_IMAGE_LIMITS } from '@/config/importLimits'
import {
  buildIntegralImage,
  queryIntegralRegion,
} from './integralImage'
import { maskFromRows } from './imageTestUtils'

const mask = maskFromRows([
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
])

const bruteForce = (
  x: number,
  y: number,
  width: number,
  height: number,
): number => {
  let total = 0
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      total += mask.values[row * mask.width + column] ?? 0
    }
  }
  return total
}

describe('墙体蒙版积分图', () => {
  const integral = buildIntegralImage(mask)

  it('使用额外首行首列和 Uint32Array', () => {
    expect(integral.stride).toBe(mask.width + 1)
    expect(integral.values).toBeInstanceOf(Uint32Array)
    expect(integral.values).toHaveLength(
      (mask.width + 1) * (mask.height + 1),
    )
  })

  it.each([
    [{ x: 0, y: 0, width: 1, height: 1 }, 1],
    [{ x: 1, y: 0, width: 2, height: 1 }, 0],
    [{ x: 1, y: 1, width: 2, height: 2 }, 3],
    [{ x: 0, y: 0, width: 4, height: 3 }, 5],
  ] as const)('查询半开矩形 %o', (bounds, expected) => {
    expect(queryIntegralRegion(integral, bounds)).toBe(expected)
  })

  it('所有合法子矩形查询与暴力遍历一致', () => {
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        for (let height = 1; height <= mask.height - y; height += 1) {
          for (let width = 1; width <= mask.width - x; width += 1) {
            const bounds = { x, y, width, height }
            expect(queryIntegralRegion(integral, bounds))
              .toBe(bruteForce(x, y, width, height))
          }
        }
      }
    }
  })

  it('越界查询返回领域错误', () => {
    expect(() => queryIntegralRegion(integral, {
      x: 3,
      y: 0,
      width: 2,
      height: 1,
    })).toThrow(expect.objectContaining({
      code: 'INTEGRAL_REGION_OUT_OF_BOUNDS',
    }))
  })

  it('当前最大像素限制的累计值不会溢出 Uint32', () => {
    expect(IMPORT_IMAGE_LIMITS.maxPixels).toBeLessThan(2 ** 32)
  })
})
