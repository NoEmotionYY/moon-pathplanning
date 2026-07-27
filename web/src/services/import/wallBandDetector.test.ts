import { describe, expect, it } from 'vitest'
import type { ProjectionProfile } from '@/types/orthogonalMaze'
import { detectWallBands } from './wallBandDetector'

const profile = (values: number[]): ProjectionProfile => {
  const typed = Float64Array.from(values)
  const maximum = Math.max(...values)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    axis: 'horizontal',
    length: values.length,
    values: typed,
    smoothedValues: typed.slice(),
    maximum,
    mean,
  }
}

describe('detectWallBands', () => {
  it.each([
    { width: 1, values: [0, 1, 0] },
    { width: 3, values: [0, 1, 1, 1, 0] },
  ])('提取 $width 像素墙带', ({ width, values }) => {
    const bands = detectWallBands(profile(values), 0.2)
    expect(bands).toHaveLength(1)
    expect(bands[0]?.thickness).toBe(width)
  })

  it('保持分离墙带并忽略弱噪声', () => {
    const bands = detectWallBands(
      profile([0.03, 1, 0.9, 0.02, 0.04, 0.8, 0.02]),
      0.25,
    )
    expect(bands).toHaveLength(2)
    expect(bands[0]?.center).toBeLessThan(bands[1]?.center ?? 0)
  })

  it('允许边界墙带存在开口后的较弱响应', () => {
    const bands = detectWallBands(
      profile([0.55, 0.5, 0.05, 0.9, 0.05, 0.52]),
      0.12,
    )
    expect(bands[0]?.start).toBe(0)
    expect(bands.at(-1)?.end).toBe(6)
  })
})
