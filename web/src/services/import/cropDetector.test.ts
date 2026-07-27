import { detectContentBounds } from './cropDetector'
import { maskFromRows } from './imageTestUtils'

const rectangleWithNoise = () => maskFromRows([
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
])

describe('内容区域投影检测', () => {
  it('去除空白、保留 margin 且不越界', () => {
    const result = detectContentBounds(rectangleWithNoise(), {
      margin: 1,
      minimumForegroundPixels: 8,
    })
    expect(result.found).toBe(true)
    expect(result.bounds).toEqual({ x: 2, y: 1, width: 8, height: 8 })
    expect(result.warnings.join()).toContain('过滤了 1 个')
  })

  it('外边框入口缺口不改变主体边界', () => {
    const result = detectContentBounds(rectangleWithNoise(), {
      margin: 0,
      minimumForegroundPixels: 8,
    })
    expect(result.bounds).toEqual({ x: 3, y: 2, width: 6, height: 6 })
  })

  it('单个离群噪点不会把裁剪扩大到整图', () => {
    const result = detectContentBounds(rectangleWithNoise(), {
      margin: 0,
      minimumForegroundPixels: 8,
    })
    expect(result.bounds.x).toBeGreaterThan(0)
    expect(result.bounds.y).toBeGreaterThan(0)
    expect(result.bounds.width).toBeLessThan(12)
    expect(result.bounds.height).toBeLessThan(10)
  })

  it('没有达到投影支持量的主体时返回失败', () => {
    const result = detectContentBounds(maskFromRows([
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ]), {
      margin: 0,
      minimumForegroundPixels: 2,
    })
    expect(result.found).toBe(false)
  })

  it('主体覆盖整图时允许返回整图', () => {
    const result = detectContentBounds(maskFromRows([
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
    ]), {
      margin: 3,
      minimumForegroundPixels: 4,
    })
    expect(result.found).toBe(true)
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 4, height: 4 })
  })
})
