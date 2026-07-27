import type { BackgroundEstimate } from '@/types/imageAnalysis'
import { detectWallPolarity } from './wallPolarity'
import { grayscaleFromRows } from './imageTestUtils'

const background = (
  luminance: number,
  isLight: boolean,
): BackgroundEstimate => ({
  luminance,
  isLight,
  confidence: 1,
  sampledPixels: 100,
  warnings: [],
})

describe('墙体极性与亮度阈值', () => {
  it('深墙浅背景稳定识别为 dark-on-light', () => {
    const grayscale = grayscaleFromRows([
      [240, 240, 20, 240, 240],
      [240, 240, 20, 240, 240],
      [20, 20, 20, 20, 20],
      [240, 240, 240, 240, 240],
    ])
    const first = detectWallPolarity(grayscale, background(240, true))
    const second = detectWallPolarity(grayscale, background(240, true))
    expect(first).toEqual(second)
    expect(first.polarity).toBe('dark-on-light')
    expect(first.wallLuminanceEstimate).toBe(20)
    expect(first.threshold).toBeGreaterThan(20)
    expect(first.threshold).toBeLessThan(240)
    expect(first.confidence).toBeGreaterThan(0.8)
  })

  it('浅墙深背景识别为 light-on-dark', () => {
    const grayscale = grayscaleFromRows([
      [20, 20, 235, 20],
      [20, 20, 235, 20],
      [235, 235, 235, 235],
      [20, 20, 20, 20],
    ])
    const result = detectWallPolarity(grayscale, background(20, false))
    expect(result.polarity).toBe('light-on-dark')
    expect(result.wallLuminanceEstimate).toBe(235)
    expect(result.threshold).toBeGreaterThan(20)
    expect(result.threshold).toBeLessThan(235)
  })

  it('抗锯齿灰色边缘落在自动墙体阈值内', () => {
    const grayscale = grayscaleFromRows([
      [235, 235, 235, 235, 235],
      [235, 30, 80, 120, 235],
      [235, 30, 80, 120, 235],
      [235, 235, 235, 235, 235],
    ])
    const result = detectWallPolarity(grayscale, background(235, true))
    expect(result.threshold).toBeGreaterThanOrEqual(120)
  })

  it('近乎纯色图片返回低置信度和警告', () => {
    const grayscale = grayscaleFromRows([
      [200, 200, 200],
      [200, 200, 200],
      [200, 200, 200],
    ])
    const result = detectWallPolarity(grayscale, background(200, true))
    expect(result.confidence).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('显式阈值覆盖自动阈值', () => {
    const grayscale = grayscaleFromRows([[20, 220, 220, 20]])
    expect(
      detectWallPolarity(grayscale, background(220, true), 77).threshold,
    ).toBe(77)
  })
})
