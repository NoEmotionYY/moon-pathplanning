import { describe, expect, it } from 'vitest'
import { WORLD_BOUNDARY_MAX_EXCLUSIVE, WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { getSparseGridWorldMetrics } from './sparseWorldMetrics'

describe('sparse world metrics', () => {
  it('counts chunks and cells and computes occupied/content bounds', () => {
    const world = SparseGridWorld.create({
      start: { x: -10, y: -10 },
      goal: { x: 10, y: 10 },
    }).withObstacle({ x: -33, y: 1 }).withTerrain({ x: 40, y: 2 }, 4)
    expect(getSparseGridWorldMetrics(world)).toEqual({
      chunkCount: 2,
      blockedCellCount: 1,
      terrainCellCount: 1,
      nonDefaultCellCount: 2,
      occupiedBounds: { minX: -33, minY: 1, maxX: 41, maxY: 3 },
      contentBounds: { minX: -33, minY: -10, maxX: 41, maxY: 11 },
    })
  })

  it('has null occupied bounds when only endpoints exist', () => {
    const metrics = getSparseGridWorldMetrics(SparseGridWorld.create({
      start: { x: 0, y: 0 },
      goal: { x: 1, y: 1 },
    }))
    expect(metrics.occupiedBounds).toBeNull()
    expect(metrics.contentBounds).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 2 })
  })

  it('supports the maximum coordinate exclusive boundary', () => {
    const world = SparseGridWorld.create({
      start: { x: -1, y: -1 },
      goal: { x: 0, y: 0 },
    }).withObstacle({ x: WORLD_COORDINATE_MAX, y: WORLD_COORDINATE_MAX })
    expect(getSparseGridWorldMetrics(world).contentBounds.maxX)
      .toBe(WORLD_BOUNDARY_MAX_EXCLUSIVE)
  })
})
