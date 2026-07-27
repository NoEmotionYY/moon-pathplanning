import { describe, expect, it } from 'vitest'
import { calculateOrientationEvidence } from './orientationEvidence'
import { detectAxisGrid } from './axisGridDetector'
import { generateOrthogonalMazeMask } from './testUtils/generateOrthogonalMazeMask'
import { buildWallProjection } from './wallProjection'
import { estimateWallThickness } from './wallThicknessEstimator'
import type { WallBand } from '@/types/orthogonalMaze'

describe('detectAxisGrid', () => {
  it.each([
    { rows: 5, columns: 5, cellWidth: 8, cellHeight: 8 },
    { rows: 8, columns: 10, cellWidth: 12, cellHeight: 12 },
    { rows: 20, columns: 20, cellWidth: 6, cellHeight: 6 },
    { rows: 7, columns: 11, cellWidth: 14, cellHeight: 9 },
  ])(
    '估计 $rows x $columns 网格及独立横纵周期',
    ({ rows, columns, cellWidth, cellHeight }) => {
      const mask = generateOrthogonalMazeMask({
        rows,
        columns,
        cellWidth,
        cellHeight,
      })
      const evidence = calculateOrientationEvidence(mask)
      const horizontal = detectAxisGrid(
        'horizontal',
        buildWallProjection(mask, 'horizontal', evidence, 1),
        mask.height,
      )
      const vertical = detectAxisGrid(
        'vertical',
        buildWallProjection(mask, 'vertical', evidence, 1),
        mask.width,
      )

      expect(horizontal.detected).toBe(true)
      expect(horizontal.cellCount).toBe(rows)
      expect(horizontal.pitch).toBe(cellHeight)
      expect(vertical.detected).toBe(true)
      expect(vertical.cellCount).toBe(columns)
      expect(vertical.pitch).toBe(cellWidth)
    },
  )

  it.each([1, 3, 5])('估计 %i 像素墙厚并支持留白', (wallThickness) => {
    const mask = generateOrthogonalMazeMask({
      rows: 8,
      columns: 10,
      cellWidth: 16,
      wallThickness,
      padding: 3,
    })
    const evidence = calculateOrientationEvidence(mask)
    const horizontal = detectAxisGrid(
      'horizontal',
      buildWallProjection(mask, 'horizontal', evidence, 1),
      mask.height,
    )
    const vertical = detectAxisGrid(
      'vertical',
      buildWallProjection(mask, 'vertical', evidence, 1),
      mask.width,
    )

    expect(horizontal.wallThickness).toBe(wallThickness)
    expect(vertical.wallThickness).toBe(wallThickness)
    expect(horizontal.cellCount).toBe(8)
    expect(vertical.cellCount).toBe(10)
  })

  it('墙厚使用中位数抵抗异常粗墙，并拒绝接近 pitch 的墙', () => {
    const band = (thickness: number): WallBand => ({
      start: 0,
      end: thickness,
      center: thickness / 2,
      thickness,
      strength: 1,
      confidence: 1,
    })
    const bands = [band(3), band(3), band(3), band(11)]
    const robust = estimateWallThickness(bands, bands, 12)
    const invalid = estimateWallThickness([band(9)], [band(9)], 12)

    expect(robust.thickness).toBe(3)
    expect(robust.valid).toBe(true)
    expect(invalid.valid).toBe(false)
    expect(invalid.warnings).toContain('GRID_WALL_THICKNESS_INVALID')
  })
})
