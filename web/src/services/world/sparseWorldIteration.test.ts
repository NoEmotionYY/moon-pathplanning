import { describe, expect, it, vi } from 'vitest'
import { WORLD_BOUNDARY_MAX_EXCLUSIVE, WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { createWorldBounds } from './worldBounds'
import {
  collectSparseWorldCellsInBounds,
  visitSparseWorldCellsInBounds,
} from './sparseWorldIteration'

describe('sparse world iteration', () => {
  const world = SparseGridWorld.create({
    start: { x: -100, y: -100 },
    goal: { x: 100, y: 100 },
  }).applyPatch({
    obstacleUpdates: [
      { point: { x: 1, y: -1 }, blocked: true },
      { point: { x: -1, y: 0 }, blocked: true },
      { point: { x: 2, y: 0 }, blocked: true },
    ],
    terrainUpdates: [{ point: { x: 0, y: 0 }, cost: 4 }],
  })

  it('visits only non-default cells in deterministic y/x order across zero', () => {
    expect(collectSparseWorldCellsInBounds(world, createWorldBounds(-2, -2, 3, 1))
      .map((cell) => cell.point)).toEqual([
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ])
  })

  it('excludes cells outside bounds without duplicates', () => {
    const cells = collectSparseWorldCellsInBounds(world, createWorldBounds(-1, 0, 1, 1))
    expect(cells.map((cell) => cell.point)).toEqual([{ x: -1, y: 0 }, { x: 0, y: 0 }])
    expect(new Set(cells.map((cell) => `${cell.point.x},${cell.point.y}`)).size).toBe(cells.length)
  })

  it('does not call visitor for empty bounds', () => {
    const visitor = vi.fn()
    visitSparseWorldCellsInBounds(world, createWorldBounds(0, 0, 0, 5), visitor)
    expect(visitor).not.toHaveBeenCalled()
  })

  it('visits a cell at the maximum legal coordinate', () => {
    const edgeWorld = SparseGridWorld.create({
      start: { x: -1, y: -1 },
      goal: { x: 0, y: 0 },
    }).withObstacle({ x: WORLD_COORDINATE_MAX, y: WORLD_COORDINATE_MAX })
    expect(collectSparseWorldCellsInBounds(edgeWorld, createWorldBounds(
      WORLD_COORDINATE_MAX,
      WORLD_COORDINATE_MAX,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
    ))).toHaveLength(1)
  })
})
