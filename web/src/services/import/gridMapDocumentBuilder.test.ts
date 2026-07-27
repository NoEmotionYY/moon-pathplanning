import { describe, expect, it } from 'vitest'
import { validateGridDocument } from '@/utils/validation'
import {
  createBlockedGrid,
  setGridWalkable,
} from './orthogonalGridBuilder'
import { buildGridMapDocumentFromOccupancy } from './gridMapDocumentBuilder'

describe('buildGridMapDocumentFromOccupancy', () => {
  it('复用现有格式并按 y、x 稳定生成障碍列表', () => {
    const grid = createBlockedGrid(5, 5)
    setGridWalkable(grid, { x: 1, y: 0 })
    setGridWalkable(grid, { x: 1, y: 1 })
    setGridWalkable(grid, { x: 2, y: 1 })
    setGridWalkable(grid, { x: 3, y: 1 })
    setGridWalkable(grid, { x: 3, y: 0 })
    const document = buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    )
    expect(document).toMatchObject({
      format: 'moon-pathplanning.grid.v1',
      width: 5,
      height: 5,
      start: [1, 0],
      goal: [3, 0],
      movement: 'four_way',
      terrain: [],
    })
    expect(document.obstacles).toEqual(
      [...document.obstacles].sort((left, right) =>
        left[1] - right[1] || left[0] - right[0]),
    )
    expect(new Set(document.obstacles.map((point) => point.join(','))).size)
      .toBe(document.obstacles.length)
    expect(document.obstacles).not.toContainEqual(document.start)
    expect(document.obstacles).not.toContainEqual(document.goal)
    expect(() => validateGridDocument(document)).not.toThrow()
  })

  it('拒绝障碍中的 start/goal 以及相同起终点', () => {
    const grid = createBlockedGrid(5, 5)
    setGridWalkable(grid, { x: 1, y: 0 })
    expect(() => buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    )).toThrow()
    expect(() => buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 1, y: 0 },
    )).toThrow()
  })

  it('现有校验默认仍限制 60，转换可显式校验到 hardMax', () => {
    const document = {
      format: 'moon-pathplanning.grid.v1' as const,
      width: 61,
      height: 61,
      start: [0, 0] as [number, number],
      goal: [60, 60] as [number, number],
      movement: 'four_way' as const,
      obstacles: [],
      terrain: [],
    }
    expect(() => validateGridDocument(document)).toThrow()
    expect(() => validateGridDocument(document, { maximumSize: 151 }))
      .not.toThrow()
  })
})
