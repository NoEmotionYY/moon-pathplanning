import { describe, expect, it } from 'vitest'
import { GRID_CONVERSION_CODES } from '@/config/orthogonalGridConversion'
import {
  createBlockedGrid,
  setGridWalkable,
} from './orthogonalGridBuilder'
import { buildGridMapDocumentFromOccupancy } from './gridMapDocumentBuilder'
import { validateConvertedGrid } from './convertedGridValidation'

describe('validateConvertedGrid', () => {
  it('四方向 BFS 验证 start/goal 和全部可通行格连通', () => {
    const grid = createBlockedGrid(5, 5)
    for (const point of [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
    ]) {
      setGridWalkable(grid, point)
    }
    const document = buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    )
    expect(validateConvertedGrid(document)).toEqual({
      valid: true,
      startWalkable: true,
      goalWalkable: true,
      connected: true,
      reachableWalkableCells: 5,
      totalWalkableCells: 5,
      warnings: [],
    })
  })

  it('start 与 goal 不连通时转换完整性失败', () => {
    const grid = createBlockedGrid(5, 5)
    setGridWalkable(grid, { x: 1, y: 0 })
    setGridWalkable(grid, { x: 3, y: 0 })
    const document = buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    )
    const result = validateConvertedGrid(document)
    expect(result.valid).toBe(false)
    expect(result.connected).toBe(false)
    expect(result.warnings).toContain(
      GRID_CONVERSION_CODES.startGoalDisconnected,
    )
  })

  it('保留非主分量并报告不可达可通行格', () => {
    const grid = createBlockedGrid(5, 5)
    for (const point of [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
      { x: 1, y: 3 },
    ]) {
      setGridWalkable(grid, point)
    }
    const document = buildGridMapDocumentFromOccupancy(
      grid,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    )
    const result = validateConvertedGrid(document)
    expect(result.valid).toBe(true)
    expect(result.reachableWalkableCells).toBe(5)
    expect(result.totalWalkableCells).toBe(6)
    expect(result.warnings).toContain(
      GRID_CONVERSION_CODES.unreachableWalkableCells,
    )
  })
})
