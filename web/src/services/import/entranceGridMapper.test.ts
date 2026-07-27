import { describe, expect, it } from 'vitest'
import { mapEntranceCandidateToGrid } from './entranceGridMapper'
import {
  makeCandidate,
  makeOuterSegment,
} from './testUtils/entranceFixtures'

describe('mapEntranceCandidateToGrid', () => {
  it.each([
    ['top', { row: 0, column: 2 }, { x: 5, y: 0 }, { x: 5, y: 1 }],
    ['bottom', { row: 3, column: 2 }, { x: 5, y: 8 }, { x: 5, y: 7 }],
    ['left', { row: 2, column: 0 }, { x: 0, y: 5 }, { x: 1, y: 5 }],
    ['right', { row: 2, column: 4 }, { x: 10, y: 5 }, { x: 9, y: 5 }],
  ] as const)('%s 入口映射到边界及相邻内部中心', (
    side,
    cell,
    boundaryPoint,
    interiorPoint,
  ) => {
    const candidate = makeCandidate(`${side}:x`, side, cell, {
      interiorCell: { ...cell },
    })
    const mapping = mapEntranceCandidateToGrid(candidate, 4, 5)
    expect(mapping.boundaryPoint).toEqual(boundaryPoint)
    expect(mapping.interiorPoint).toEqual(interiorPoint)
    expect(
      Math.abs(boundaryPoint.x - interiorPoint.x) +
      Math.abs(boundaryPoint.y - interiorPoint.y),
    ).toBe(1)
  })

  it('宽入口开放所有覆盖边界格但只使用代表格作为起终点', () => {
    const candidate = makeCandidate(
      'top:1-2',
      'top',
      { row: 0, column: 1 },
      {
        startIndex: 1,
        endIndex: 2,
        widthInCells: 2,
        segments: [
          makeOuterSegment('top', 1, 4, 5, 'open'),
          makeOuterSegment('top', 2, 4, 5, 'open'),
        ],
      },
    )
    const mapping = mapEntranceCandidateToGrid(candidate, 4, 5)
    expect(mapping.boundaryPoint).toEqual({ x: 3, y: 0 })
    expect(mapping.openedBoundaryPoints).toEqual([
      { x: 3, y: 0 },
      { x: 5, y: 0 },
    ])
  })

  it('拐角合并候选可以开放两条相邻外边界且不越界', () => {
    const candidate = makeCandidate(
      'corner:top-left:0-0',
      'top',
      { row: 0, column: 0 },
      {
        segments: [
          makeOuterSegment('top', 0, 4, 5, 'open'),
          makeOuterSegment('left', 0, 4, 5, 'open'),
        ],
      },
    )
    expect(mapEntranceCandidateToGrid(candidate, 4, 5)
      .openedBoundaryPoints).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ])
  })

  it('拒绝边方向与单元不匹配的候选', () => {
    const candidate = makeCandidate(
      'top:bad',
      'top',
      { row: 1, column: 1 },
    )
    expect(() => mapEntranceCandidateToGrid(candidate, 4, 5))
      .toThrow()
  })
})
