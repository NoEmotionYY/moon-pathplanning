import { describe, expect, it } from 'vitest'
import { assignCellComponents } from './topologyComponents'
import { makeEdge } from './testUtils/entranceFixtures'

describe('assignCellComponents', () => {
  it('完整连通迷宫只有一个稳定分量', () => {
    const edges = [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 1 }),
      makeEdge({ row: 0, column: 1 }, { row: 1, column: 1 }),
      makeEdge({ row: 1, column: 1 }, { row: 1, column: 0 }),
    ]
    const result = assignCellComponents(2, 2, edges)
    expect([...result.componentIdByCell]).toEqual([0, 0, 0, 0])
    expect(result.componentSizes).toEqual([4])
  })

  it('两个区域和孤立单元获得不同的行优先稳定 ID', () => {
    const edges = [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 1 }),
      makeEdge({ row: 1, column: 0 }, { row: 1, column: 1 }),
    ]
    const result = assignCellComponents(2, 3, edges)
    expect([...result.componentIdByCell]).toEqual([0, 0, 1, 2, 2, 3])
    expect(result.componentSizes).toEqual([2, 1, 2, 1])
  })

  it('不修改输入边并处理空尺寸', () => {
    const edges = [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 1 }),
    ]
    const before = structuredClone(edges)
    expect(assignCellComponents(0, 2, edges).componentSizes).toEqual([])
    expect(edges).toEqual(before)
  })
})
