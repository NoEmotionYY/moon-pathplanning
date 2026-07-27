import { describe, expect, it } from 'vitest'
import { GRID_CONVERSION_CODES } from '@/config/orthogonalGridConversion'
import {
  createBlockedGrid,
  isGridBlocked,
  openMazeCellCenters,
  openMazePassages,
} from './orthogonalGridBuilder'
import { GridConversionError } from './gridConversionError'
import { makeEdge } from './testUtils/entranceFixtures'

describe('orthogonalGridBuilder', () => {
  it('创建全障碍 TypedArray 网格并开放全部逻辑单元中心', () => {
    const grid = createBlockedGrid(5, 5)
    expect(grid.blocked).toBeInstanceOf(Uint8Array)
    expect([...grid.blocked].every((value) => value === 1)).toBe(true)
    const mappings = openMazeCellCenters(grid, 2, 2)
    expect(mappings).toHaveLength(4)
    expect(mappings.map((mapping) => mapping.grid)).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
    ])
    expect(mappings.every((mapping) =>
      mapping.grid.x % 2 === 1 &&
      mapping.grid.y % 2 === 1 &&
      !isGridBlocked(grid, mapping.grid))).toBe(true)
    expect(isGridBlocked(grid, { x: 0, y: 0 })).toBe(true)
  })

  it('每条唯一四邻接边只开放一个稳定排序的通道格', () => {
    const grid = createBlockedGrid(5, 5)
    openMazeCellCenters(grid, 2, 2)
    const horizontal = makeEdge(
      { row: 0, column: 0 },
      { row: 0, column: 1 },
    )
    const vertical = makeEdge(
      { row: 0, column: 1 },
      { row: 1, column: 1 },
    )
    const points = openMazePassages(
      grid,
      2,
      2,
      [vertical, horizontal, { ...horizontal }],
    )
    expect(points).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 2 },
    ])
    expect(points.every((point) => !isGridBlocked(grid, point))).toBe(true)
  })

  it('没有邻接边时 wall 和 uncertain 对应中间格保持障碍', () => {
    const grid = createBlockedGrid(5, 5)
    openMazeCellCenters(grid, 2, 2)
    expect(openMazePassages(grid, 2, 2, [])).toEqual([])
    expect(isGridBlocked(grid, { x: 2, y: 1 })).toBe(true)
    expect(isGridBlocked(grid, { x: 1, y: 2 })).toBe(true)
  })

  it.each([
    [
      makeEdge({ row: 0, column: 0 }, { row: 1, column: 1 }),
      '对角边',
    ],
    [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 0 }),
      '自环',
    ],
    [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 2 }),
      '越界边',
    ],
  ])('拒绝%s', (edge) => {
    const grid = createBlockedGrid(5, 5)
    expect(() => openMazePassages(grid, 2, 2, [edge]))
      .toThrowError(GridConversionError)
    try {
      openMazePassages(grid, 2, 2, [edge])
    } catch (error) {
      expect((error as GridConversionError).code)
        .toBe(GRID_CONVERSION_CODES.edgeInvalid)
    }
  })
})
