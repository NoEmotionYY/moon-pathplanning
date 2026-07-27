import {
  calculateLuminance,
  createGrayscaleImage,
} from './imageAnalysis'
import { createImage } from './imageTestUtils'

describe('亮度转换与 Alpha 合成', () => {
  it('使用感知亮度权重处理黑白与 RGB', () => {
    expect(calculateLuminance(0, 0, 0)).toBe(0)
    expect(calculateLuminance(255, 255, 255)).toBe(255)
    expect(calculateLuminance(255, 0, 0)).toBeCloseTo(54.213, 3)
    expect(calculateLuminance(0, 255, 0)).toBeCloseTo(182.376, 3)
    expect(calculateLuminance(0, 0, 255)).toBeCloseTo(18.411, 3)
  })

  it('透明黑色在浅色背景模式下不会成为黑墙', () => {
    const image = createImage(2, 1, (x) =>
      x === 0 ? [0, 0, 0, 0] : [0, 0, 0, 128])
    const before = [...image.rgba]
    const grayscale = createGrayscaleImage(image, {
      transparentBackground: 'light',
    })

    expect([...grayscale.values]).toEqual([255, 127])
    expect([...image.rgba]).toEqual(before)
  })

  it('深色背景模式使用明确 Alpha 公式合成半透明像素', () => {
    const image = createImage(1, 1, () => [200, 200, 200, 128])
    const grayscale = createGrayscaleImage(image, {
      transparentBackground: 'dark',
    })
    expect(grayscale.values[0]).toBe(100)
  })

  it('auto 无法从透明边缘判断背景时默认浅色并给出警告', () => {
    const image = createImage(9, 9, (x, y) =>
      x === 4 && y === 4 ? [0, 0, 0, 255] : [0, 0, 0, 0])
    const grayscale = createGrayscaleImage(image)
    expect(grayscale.values[0]).toBe(255)
    expect(grayscale.values[40]).toBe(0)
    expect(grayscale.warnings.length).toBeGreaterThan(0)
  })

  it('无效 RGBA 长度立即返回领域错误', () => {
    expect(() => createGrayscaleImage({
      width: 2,
      height: 2,
      rgba: new Uint8ClampedArray(3),
    })).toThrow(expect.objectContaining({
      code: 'IMAGE_PIXEL_DATA_INVALID',
    }))
  })
})
