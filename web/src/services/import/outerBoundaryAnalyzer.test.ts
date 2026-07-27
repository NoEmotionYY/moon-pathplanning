import { describe, expect, it } from 'vitest'
import { buildIntegralImage } from './integralImage'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { analyzeOuterBoundaries } from './outerBoundaryAnalyzer'
import { generateMazeMaskFromPassages } from './testUtils/generateOrthogonalMazeMask'

describe('analyzeOuterBoundaries', () => {
  it('识别四侧多个开放段并保留其余完整外墙', () => {
    const rows = 4
    const columns = 5
    const { mask } = generateMazeMaskFromPassages(
      {
        rows,
        columns,
        cellWidth: 12,
        wallThickness: 3,
        openings: [
          { side: 'top', cellIndex: 1 },
          { side: 'right', cellIndex: 2 },
          { side: 'bottom', cellIndex: 3 },
          { side: 'left', cellIndex: 0 },
          { side: 'top', cellIndex: 4 },
        ],
      },
      [],
    )
    const integral = buildIntegralImage(mask)
    const detection = detectOrthogonalMaze(mask, integral)
    expect(detection.detected).toBe(true)
    const boundaries = analyzeOuterBoundaries(mask, integral, detection)

    expect(boundaries).toHaveLength(2 * rows + 2 * columns)
    const open = boundaries.filter(
      (boundary) => boundary.evidence.state === 'open',
    )
    expect(open.map((boundary) =>
      `${boundary.side}:${boundary.side === 'top' ||
        boundary.side === 'bottom'
        ? boundary.cell.column
        : boundary.cell.row}`,
    ).sort()).toEqual([
      'bottom:3',
      'left:0',
      'right:2',
      'top:1',
      'top:4',
    ])
    expect(boundaries.filter(
      (boundary) => boundary.evidence.state === 'wall',
    ).length).toBe(boundaries.length - open.length)
  })

  it('本阶段只返回边界状态，不选择入口出口', () => {
    const { mask } = generateMazeMaskFromPassages(
      { rows: 2, columns: 2, openings: false },
      [],
    )
    const integral = buildIntegralImage(mask)
    const detection = detectOrthogonalMaze(mask, integral)
    const boundaries = analyzeOuterBoundaries(mask, integral, detection)

    expect(boundaries).toHaveLength(8)
    expect(boundaries.every(
      (boundary) => boundary.evidence.state === 'wall',
    )).toBe(true)
    expect(boundaries.some((boundary) =>
      'start' in boundary || 'goal' in boundary,
    )).toBe(false)
  })
})
