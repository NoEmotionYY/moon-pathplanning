import type { ImageMatrix, ImageTransformState } from '@/types/import'
import {
  applyImageTransforms,
  flipImageMatrix,
  invertImageMatrix,
  rotateImageMatrix,
} from './imageTransform'

const matrix = (
  width: number,
  height: number,
  values: number[],
): ImageMatrix => {
  const rgba = new Uint8ClampedArray(width * height * 4)
  values.forEach((value, index) => {
    const offset = index * 4
    rgba[offset] = value
    rgba[offset + 1] = value + 1
    rgba[offset + 2] = value + 2
    rgba[offset + 3] = 100 + index
  })
  return { width, height, rgba }
}

const redValues = (image: ImageMatrix): number[] => {
  const values: number[] = []
  for (let index = 0; index < image.rgba.length; index += 4) {
    values.push(image.rgba[index] ?? 0)
  }
  return values
}

describe('ImageMatrix 纯函数变换', () => {
  const source = matrix(3, 2, [1, 2, 3, 4, 5, 6])

  it('顺时针旋转 90° 后交换宽高并映射坐标', () => {
    const result = rotateImageMatrix(source, 90)
    expect([result.width, result.height]).toEqual([2, 3])
    expect(redValues(result)).toEqual([4, 1, 5, 2, 6, 3])
  })

  it('旋转 180° 坐标正确', () => {
    expect(redValues(rotateImageMatrix(source, 180))).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('顺时针旋转 270° 坐标正确', () => {
    const result = rotateImageMatrix(source, 270)
    expect([result.width, result.height]).toEqual([2, 3])
    expect(redValues(result)).toEqual([3, 6, 2, 5, 1, 4])
  })

  it('水平翻转正确', () => {
    expect(redValues(flipImageMatrix(source, true, false))).toEqual([3, 2, 1, 6, 5, 4])
  })

  it('垂直翻转正确', () => {
    expect(redValues(flipImageMatrix(source, false, true))).toEqual([4, 5, 6, 1, 2, 3])
  })

  it('同时水平和垂直翻转正确', () => {
    expect(redValues(flipImageMatrix(source, true, true))).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('反色只修改 RGB，Alpha 保持不变', () => {
    const input = matrix(1, 1, [10])
    input.rgba[3] = 77
    expect([...invertImageMatrix(input).rgba]).toEqual([245, 244, 243, 77])
  })

  it('不会修改原始 ImageMatrix', () => {
    const before = [...source.rgba]
    rotateImageMatrix(source, 90)
    flipImageMatrix(source, true, true)
    invertImageMatrix(source)
    expect([...source.rgba]).toEqual(before)
  })

  it('组合变换顺序稳定且仅生成最终语义结果', () => {
    const state: ImageTransformState = {
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
      invert: true,
    }
    const combined = applyImageTransforms(source, state)
    const sequential = invertImageMatrix(
      flipImageMatrix(rotateImageMatrix(source, 90), true, false),
    )
    expect(combined).toEqual(sequential)
  })
})
