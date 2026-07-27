import type { WallPolarityAnalysis } from '@/types/imageAnalysis'
import {
  calculateMaskStatistics,
  createWallMask,
} from './wallMask'
import { grayscaleFromRows, maskFromRows } from './imageTestUtils'

const analysis = (
  polarity: WallPolarityAnalysis['polarity'],
  threshold: number,
): WallPolarityAnalysis => ({
  polarity,
  threshold,
  confidence: 1,
  backgroundLuminance: polarity === 'dark-on-light' ? 240 : 20,
  wallLuminanceEstimate: polarity === 'dark-on-light' ? 20 : 240,
  warnings: [],
})

describe('墙体二值蒙版', () => {
  it('深墙为 1、背景为 0', () => {
    const grayscale = grayscaleFromRows([[20, 80, 180, 240]])
    const before = [...grayscale.values]
    const mask = createWallMask(
      grayscale,
      analysis('dark-on-light', 100),
    )
    expect([...mask.values]).toEqual([1, 1, 0, 0])
    expect([...grayscale.values]).toEqual(before)
  })

  it('浅墙为 1、深背景为 0', () => {
    const mask = createWallMask(
      grayscaleFromRows([[20, 80, 180, 240]]),
      analysis('light-on-dark', 160),
    )
    expect([...mask.values]).toEqual([0, 0, 1, 1])
  })

  it('统计墙体、空闲像素和比例', () => {
    const statistics = calculateMaskStatistics(maskFromRows([
      [1, 0, 1],
      [0, 0, 1],
    ]))
    expect(statistics).toMatchObject({
      wallPixels: 3,
      freePixels: 3,
      wallRatio: 0.5,
    })
  })

  it('空蒙版和全墙蒙版返回诊断警告', () => {
    expect(calculateMaskStatistics(maskFromRows([[0, 0]])).warnings)
      .toContain('墙体蒙版中的墙体比例接近 0。')
    expect(calculateMaskStatistics(maskFromRows([[1, 1]])).warnings)
      .toContain('墙体蒙版中的墙体比例接近 1。')
  })

  it('非法蒙版尺寸立即拒绝', () => {
    expect(() => calculateMaskStatistics({
      width: 2,
      height: 2,
      values: new Uint8Array(3),
    })).toThrow(expect.objectContaining({
      code: 'IMAGE_PIXEL_DATA_INVALID',
    }))
  })
})
