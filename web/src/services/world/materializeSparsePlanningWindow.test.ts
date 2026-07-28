import { describe, expect, it } from 'vitest'
import { SparseGridWorld } from './SparseGridWorld'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import { validateGridDocument } from '@/utils/validation'

const bounds = (minX: number, minY: number, maxX: number, maxY: number) => ({
  bounds: { minX, minY, maxX, maxY },
})

describe('materialize sparse planning window', () => {
  it('materializes an empty world with mapped endpoints and movement', () => {
    const world = SparseGridWorld.create({
      start: { x: -2, y: -1 },
      goal: { x: 2, y: 1 },
      movement: 'eight_way',
      worldVersion: 7,
    })
    const result = materializeSparsePlanningWindow(world, bounds(-2, -2, 3, 3))
    expect(result.document).toMatchObject({
      width: 5,
      height: 5,
      start: [0, 1],
      goal: [4, 3],
      movement: 'eight_way',
      obstacles: [],
      terrain: [],
    })
    expect(result.sourceWorldVersion).toBe(7)
    expect(world.worldVersion).toBe(7)
    expect(() => validateGridDocument(result.document, { maximumSize: 151 })).not.toThrow()
  })

  it('clips obstacles and terrain to half-open bounds with stable local sorting', () => {
    const world = SparseGridWorld.create({
      start: { x: -4, y: -4 },
      goal: { x: 4, y: 4 },
    }).applyPatch({
      obstacleUpdates: [
        { point: { x: 2, y: 0 }, blocked: true },
        { point: { x: -2, y: 0 }, blocked: true },
        { point: { x: 0, y: -2 }, blocked: true },
        { point: { x: 5, y: 0 }, blocked: true },
      ],
      terrainUpdates: [
        { point: { x: 1, y: 2 }, cost: 4 },
        { point: { x: -1, y: 2 }, cost: 2 },
        { point: { x: -5, y: 0 }, cost: 8 },
      ],
    })
    const result = materializeSparsePlanningWindow(world, bounds(-4, -4, 5, 5))
    expect(result.document.obstacles).toEqual([[4, 2], [2, 4], [6, 4]])
    expect(result.document.terrain).toEqual([
      { point: [3, 6], cost: 2 },
      { point: [5, 6], cost: 4 },
    ])
    expect(result.metrics).toMatchObject({ obstacleCount: 3, terrainCount: 2 })
  })

  it.each([
    [bounds(0, 0, 5, 5), 'SPARSE_PLANNING_START_OUTSIDE_WINDOW'],
    [bounds(-5, -5, 0, 0), 'SPARSE_PLANNING_GOAL_OUTSIDE_WINDOW'],
  ])('rejects endpoint outside explicit window', (request, code) => {
    const world = SparseGridWorld.create({ start: { x: -1, y: -1 }, goal: { x: 1, y: 1 } })
    expect(() => materializeSparsePlanningWindow(world, request)).toThrowError(
      expect.objectContaining({ code }),
    )
  })

  it('does not modify request and returns defensive bounds copies', () => {
    const world = SparseGridWorld.create({ start: { x: 0, y: 0 }, goal: { x: 4, y: 4 } })
    const request = Object.freeze({ bounds: Object.freeze({ minX: 0, minY: 0, maxX: 5, maxY: 5 }) })
    const result = materializeSparsePlanningWindow(world, request)
    expect(result.request.bounds).not.toBe(request.bounds)
    expect(request.bounds).toEqual({ minX: 0, minY: 0, maxX: 5, maxY: 5 })
  })

  it('materializes an empty 151×151 window without default cell objects', () => {
    const world = SparseGridWorld.create({ start: { x: 0, y: 0 }, goal: { x: 150, y: 150 } })
    const result = materializeSparsePlanningWindow(world, bounds(0, 0, 151, 151))
    expect(result.document.obstacles).toHaveLength(0)
    expect(result.document.terrain).toHaveLength(0)
    expect(result.metrics.cellCount).toBe(22_801)
    expect(result.metrics.intersectingChunkCount).toBe(25)
  })

  it('selects a 60×60 window from a world with 100,000 dispersed obstacles', () => {
    const obstacles = Array.from({ length: 100_000 }, (_, index) => ({
      point: { x: index * 9_000, y: -index * 9_000 },
      blocked: true,
    }))
    const world = SparseGridWorld.create({
      start: { x: -1, y: -1 },
      goal: { x: 1, y: 1 },
    }).applyPatch({ obstacleUpdates: obstacles })
    const result = materializeSparsePlanningWindow(world, bounds(-30, -30, 30, 30))
    expect(result.document.obstacles).toEqual([[30, 30]])
    expect(result.metrics.obstacleCount).toBe(1)
    expect(result.metrics.intersectingChunkCount).toBe(4)
    expect(world.worldVersion).toBe(1)
  }, 30_000)
})
