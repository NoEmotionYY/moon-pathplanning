import { describe, expect, it } from 'vitest'
import { calculateOrientationEvidence } from './orientationEvidence'
import { generateOrthogonalMazeMask } from './testUtils/generateOrthogonalMazeMask'
import { buildWallProjection, smoothProjection } from './wallProjection'

describe('wallProjection', () => {
  it('在理论水平和垂直墙线上形成峰值', () => {
    const mask = generateOrthogonalMazeMask({
      rows: 5,
      columns: 6,
      cellWidth: 12,
      cellHeight: 8,
      openings: true,
    })
    const evidence = calculateOrientationEvidence(mask)
    const horizontal = buildWallProjection(mask, 'horizontal', evidence)
    const vertical = buildWallProjection(mask, 'vertical', evidence)

    expect(horizontal.values[0]).toBeGreaterThan(horizontal.mean)
    expect(horizontal.values[8]).toBeGreaterThan(horizontal.mean)
    expect(vertical.values[0]).toBeGreaterThan(vertical.mean)
    expect(vertical.values[12]).toBeGreaterThan(vertical.mean)
  })

  it('平滑保持长度且降低孤立尖峰', () => {
    const values = Float64Array.from([0, 0, 1, 0, 0])
    const smoothed = smoothProjection(values, 1)

    expect(smoothed).toHaveLength(values.length)
    expect(smoothed[2]).toBeCloseTo(1 / 3)
    expect(smoothed[1]).toBeCloseTo(1 / 3)
    expect(values[2]).toBe(1)
  })

  it('半径 0 返回等值副本且不修改输入', () => {
    const values = Float64Array.from([0, 0.25, 1, 0.25, 0])
    const original = values.slice()
    const smoothed = smoothProjection(values, 0)

    expect(smoothed).toEqual(values)
    expect(smoothed).not.toBe(values)
    expect(values).toEqual(original)
    expect(smoothed.indexOf(Math.max(...smoothed))).toBe(2)
  })
})
