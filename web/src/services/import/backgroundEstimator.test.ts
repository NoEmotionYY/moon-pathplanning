import { estimateBackground } from './backgroundEstimator'
import {
  createImage,
  createSolidImage,
} from './imageTestUtils'

describe('边缘背景估计', () => {
  it.each([
    [255, true],
    [220, true],
    [0, false],
    [35, false],
  ] as const)('识别亮度 %i 的纯色背景', (value, isLight) => {
    const result = estimateBackground(
      createSolidImage(20, 16, [value, value, value, 255]),
    )
    expect(result.luminance).toBe(value)
    expect(result.isLight).toBe(isLight)
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it('边框存在黑色墙线时仍估计内部浅灰背景', () => {
    const image = createImage(24, 20, (x, y) =>
      x === 0 || y === 0 || x === 23 || y === 19
        ? [10, 10, 10, 255]
        : [232, 232, 232, 255])
    const result = estimateBackground(image)
    expect(result.isLight).toBe(true)
    expect(result.luminance).toBeGreaterThan(220)
  })

  it('少量角落噪点不会改变主背景估计', () => {
    const image = createImage(24, 20, (x, y) =>
      (x === 0 && y === 0) || (x === 23 && y === 19)
        ? [0, 0, 0, 255]
        : [210, 210, 210, 255])
    const result = estimateBackground(image)
    expect(result.isLight).toBe(true)
    expect(result.luminance).toBe(210)
  })

  it('全透明背景默认浅色并明确降低置信度', () => {
    const result = estimateBackground(
      createSolidImage(12, 12, [0, 0, 0, 0]),
    )
    expect(result).toMatchObject({
      luminance: 255,
      isLight: true,
      confidence: 0,
      sampledPixels: 0,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
