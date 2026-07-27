import { describe, expect, it } from 'vitest'
import type { InternalBoundary } from '@/types/mazeTopology'
import { buildIntegralImage } from './integralImage'
import { analyzeInternalBoundaries } from './internalBoundaryAnalyzer'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { generateMazeMaskFromPassages } from './testUtils/generateOrthogonalMazeMask'

const analyze = (
  rows: number,
  columns: number,
  wallThickness = 1,
) => {
  const { mask } = generateMazeMaskFromPassages(
    {
      rows,
      columns,
      cellWidth: 12,
      wallThickness,
    },
    [],
  )
  const integral = buildIntegralImage(mask)
  const detection = detectOrthogonalMaze(mask, integral)
  expect(detection.detected).toBe(true)
  return {
    detection,
    internal: analyzeInternalBoundaries(mask, integral, detection),
  }
}

const boundaryKey = (boundary: InternalBoundary): string =>
  `${boundary.from.row},${boundary.from.column}-` +
  `${boundary.to.row},${boundary.to.column}`

describe('analyzeInternalBoundaries', () => {
  it.each([
    { rows: 2, columns: 2 },
    { rows: 5, columns: 5 },
    { rows: 8, columns: 10 },
  ])('生成 $rows x $columns 的准确边界数量', ({ rows, columns }) => {
    const { internal } = analyze(rows, columns)
    expect(internal.horizontal).toHaveLength((rows - 1) * columns)
    expect(internal.vertical).toHaveLength(rows * (columns - 1))
  })

  it('所有边界坐标合法、相邻且不重复', () => {
    const rows = 5
    const columns = 5
    const { internal } = analyze(rows, columns, 3)
    const boundaries = [...internal.horizontal, ...internal.vertical]
    const keys = boundaries.map(boundaryKey)

    expect(new Set(keys).size).toBe(keys.length)
    for (const boundary of boundaries) {
      for (const cell of [boundary.from, boundary.to]) {
        expect(cell.row).toBeGreaterThanOrEqual(0)
        expect(cell.row).toBeLessThan(rows)
        expect(cell.column).toBeGreaterThanOrEqual(0)
        expect(cell.column).toBeLessThan(columns)
      }
      expect(
        Math.abs(boundary.from.row - boundary.to.row) +
        Math.abs(boundary.from.column - boundary.to.column),
      ).toBe(1)
      expect(boundary.from).not.toEqual(boundary.to)
      expect(boundary.evidence.state).toBe('wall')
    }
  })
})
