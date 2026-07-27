import { describe, expect, it } from 'vitest'
import {
  getOuterBoundarySegmentIndex,
  sortOuterBoundarySegments,
} from './outerBoundaryOrdering'
import { makeOuterSegment } from './testUtils/entranceFixtures'

describe('outerBoundaryOrdering', () => {
  it('按 top、right、bottom、left 及各边递增索引稳定排序', () => {
    const rows = 3
    const columns = 4
    const input = [
      makeOuterSegment('left', 2, rows, columns),
      makeOuterSegment('bottom', 3, rows, columns),
      makeOuterSegment('top', 2, rows, columns),
      makeOuterSegment('right', 1, rows, columns),
      makeOuterSegment('bottom', 0, rows, columns),
      makeOuterSegment('left', 0, rows, columns),
      makeOuterSegment('top', 0, rows, columns),
      makeOuterSegment('right', 0, rows, columns),
    ]
    const snapshot = [...input]
    const result = sortOuterBoundarySegments(input, rows, columns)

    expect(result.map((segment) =>
      `${segment.side}:${getOuterBoundarySegmentIndex(
        segment,
        rows,
        columns,
      )}`,
    )).toEqual([
      'top:0',
      'top:2',
      'right:0',
      'right:1',
      'bottom:0',
      'bottom:3',
      'left:0',
      'left:2',
    ])
    expect(input).toEqual(snapshot)
  })

  it('相同输入产生相同顺序且不会混淆边与单元坐标', () => {
    const segment = makeOuterSegment('bottom', 2, 5, 6)
    expect(getOuterBoundarySegmentIndex(segment, 5, 6)).toBe(2)
    expect(sortOuterBoundarySegments([segment], 5, 6))
      .toEqual(sortOuterBoundarySegments([segment], 5, 6))
  })

  it('非法边界单元返回 -1', () => {
    const segment = makeOuterSegment('top', 1, 3, 3)
    segment.cell.row = 1
    expect(getOuterBoundarySegmentIndex(segment, 3, 3)).toBe(-1)
  })
})
