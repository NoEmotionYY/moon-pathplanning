import { describe, expect, it } from 'vitest'
import { WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import { makeSparseObstacles } from '@/services/import/__fixtures__/sparseGridDocuments'
import { SparseGridWorld } from './SparseGridWorld'
import { getSparseGridWorldMetrics } from './sparseWorldMetrics'

const createWorld = () => SparseGridWorld.create({
  start: { x: -1, y: 0 },
  goal: { x: 1, y: 0 },
})

describe('SparseGridWorld', () => {
  it('creates an empty sparse world with default passable cells', () => {
    const world = createWorld()
    expect(world.chunkCount).toBe(0)
    expect(world.isBlocked({ x: 500_000_000, y: -500_000_000 })).toBe(false)
    expect(world.terrainCost({ x: 500_000_000, y: -500_000_000 })).toBe(1)
    expect(world.worldVersion).toBe(0)
  })

  it.each([
    { x: 34, y: 65 },
    { x: -34, y: -65 },
    { x: WORLD_COORDINATE_MAX, y: WORLD_COORDINATE_MAX },
  ])('stores a distant obstacle at %j in only one chunk', (point) => {
    const original = createWorld()
    const changed = original.withObstacle(point)
    expect(changed.isBlocked(point)).toBe(true)
    expect(changed.chunkCount).toBe(1)
    expect(original.isBlocked(point)).toBe(false)
    expect(changed.worldVersion).toBe(1)
  })

  it('removes the final cell and its empty chunk', () => {
    const point = { x: 100, y: -100 }
    const blocked = createWorld().withObstacle(point)
    expect(blocked.withObstacle(point, false).chunkCount).toBe(0)
  })

  it('rejects invalid endpoint and cell conflicts', () => {
    const world = createWorld()
    expect(() => SparseGridWorld.create({ start: { x: 0, y: 0 }, goal: { x: 0, y: 0 } }))
      .toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_ENDPOINT_CONFLICT' }))
    expect(() => world.withObstacle(world.start))
      .toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_OBSTACLE_ON_ENDPOINT' }))
    const blocked = world.withObstacle({ x: 5, y: 5 })
    expect(() => blocked.withTerrain({ x: 5, y: 5 }, 2))
      .toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_TERRAIN_ON_BLOCKED' }))
    expect(() => world.withTerrain(world.goal, 2))
      .toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_TERRAIN_ON_ENDPOINT' }))
    expect(() => world.withTerrain({ x: 2, y: 2 }, 0))
      .toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_TERRAIN_COST_INVALID' }))
  })

  it('moves an endpoint onto terrain by clearing the terrain once', () => {
    const terrain = createWorld().withTerrain({ x: 8, y: 8 }, 4)
    const moved = terrain.withStart({ x: 8, y: 8 })
    expect(moved.start).toEqual({ x: 8, y: 8 })
    expect(moved.terrainCost({ x: 8, y: 8 })).toBe(1)
    expect(moved.worldVersion).toBe(2)
  })

  it('returns the same instance for no-ops and a new instance for changes', () => {
    const world = createWorld()
    expect(world.withObstacle({ x: 5, y: 5 }, false)).toBe(world)
    expect(world.withTerrain({ x: 5, y: 5 }, null)).toBe(world)
    expect(world.withMovement('four_way')).toBe(world)
    expect(world.withMovement('eight_way')).not.toBe(world)
  })

  it('returns safe chunk snapshots', () => {
    const world = createWorld().withObstacle({ x: 5, y: 5 })
    const snapshot = world.getChunkSnapshot({ chunkX: 0, chunkY: 0 })!
    snapshot.blockedWords[0] = 0
    ;(snapshot.terrain as Map<number, number>).set(0, 99)
    expect(world.isBlocked({ x: 5, y: 5 })).toBe(true)
    expect(world.terrainCost({ x: 0, y: 0 })).toBe(1)
  })

  it('applies duplicate updates atomically with last same-kind update winning', () => {
    const world = createWorld()
    const changed = world.applyPatch({
      obstacleUpdates: [
        { point: { x: 5, y: 5 }, blocked: true },
        { point: { x: 5, y: 5 }, blocked: false },
        { point: { x: 6, y: 6 }, blocked: true },
      ],
      terrainUpdates: [
        { point: { x: 7, y: 7 }, cost: 2 },
        { point: { x: 7, y: 7 }, cost: 8 },
      ],
    })
    expect(changed.isBlocked({ x: 5, y: 5 })).toBe(false)
    expect(changed.isBlocked({ x: 6, y: 6 })).toBe(true)
    expect(changed.terrainCost({ x: 7, y: 7 })).toBe(8)
    expect(changed.worldVersion).toBe(1)
  })

  it('moves start and blocks its former location in one patch', () => {
    const world = createWorld()
    const changed = world.applyPatch({
      start: { x: 10, y: 10 },
      obstacleUpdates: [{ point: world.start, blocked: true }],
    })
    expect(changed.start).toEqual({ x: 10, y: 10 })
    expect(changed.isBlocked({ x: -1, y: 0 })).toBe(true)
  })

  it('uses obstacle priority independent of terrain update order', () => {
    const point = { x: 20, y: 20 }
    const changed = createWorld().applyPatch({
      terrainUpdates: [{ point, cost: 4 }],
      obstacleUpdates: [{ point, blocked: true }],
    })
    expect(changed.getCell(point)).toEqual({ point, blocked: true, terrainCost: 1 })
  })

  it('rejects a patch whose final endpoint is blocked', () => {
    const world = createWorld()
    expect(() => world.applyPatch({
      obstacleUpdates: [{ point: world.goal, blocked: true }],
    })).toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_ENDPOINT_BLOCKED' }))
    expect(world.chunkCount).toBe(0)
  })

  it('rejects a patch whose final endpoint has non-default terrain', () => {
    const world = createWorld()
    expect(() => world.applyPatch({
      terrainUpdates: [{ point: world.start, cost: 4 }],
    })).toThrowError(expect.objectContaining({ code: 'SPARSE_WORLD_TERRAIN_ON_ENDPOINT' }))
    expect(world.terrainCost(world.start)).toBe(1)
  })

  it('removes a chunk after deleting its final terrain cell', () => {
    const point = { x: -200, y: 300 }
    const terrain = createWorld().withTerrain(point, 8)
    expect(terrain.chunkCount).toBe(1)
    expect(terrain.withTerrain(point, null).chunkCount).toBe(0)
  })

  it('leaves the old world unchanged when a patch fails', () => {
    const world = createWorld().withTerrain({ x: 9, y: 9 }, 2)
    expect(() => world.applyPatch({
      start: { x: 4, y: 4 },
      goal: { x: 4, y: 4 },
      obstacleUpdates: [{ point: { x: 10, y: 10 }, blocked: true }],
    })).toThrow()
    expect(world.chunkCount).toBe(1)
    expect(world.terrainCost({ x: 9, y: 9 })).toBe(2)
  })

  it('applies 10,000 dispersed cells in one version increment', () => {
    const points = makeSparseObstacles(10_000)
    const world = createWorld().applyPatch({
      obstacleUpdates: points.map(([x, y]) => ({ point: { x, y }, blocked: true })),
    })
    expect(world.worldVersion).toBe(1)
    expect(getSparseGridWorldMetrics(world).nonDefaultCellCount).toBe(10_000)
    expect(world.chunkCount).toBe(10_000)
  })
})
