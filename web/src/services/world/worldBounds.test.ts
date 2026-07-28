import { describe, expect, it } from 'vitest'
import {
  WORLD_BOUNDARY_MAX_EXCLUSIVE,
  WORLD_COORDINATE_MAX,
} from '@/config/worldGrid'
import {
  containsWorldPoint,
  createWorldBounds,
  expandWorldBounds,
  intersectWorldBounds,
  intersectsWorldBounds,
  iterateChunkCoordinatesForBounds,
  translateWorldBounds,
  worldBoundsFromPoints,
  worldBoundsHeight,
  worldBoundsWidth,
} from './worldBounds'

describe('world bounds', () => {
  it('uses half-open containment and excludes max boundaries', () => {
    const bounds = createWorldBounds(-2, -3, 4, 5)
    expect(containsWorldPoint(bounds, { x: -2, y: -3 })).toBe(true)
    expect(containsWorldPoint(bounds, { x: 3, y: 4 })).toBe(true)
    expect(containsWorldPoint(bounds, { x: 4, y: 4 })).toBe(false)
    expect(containsWorldPoint(bounds, { x: 3, y: 5 })).toBe(false)
    expect(worldBoundsWidth(bounds)).toBe(6)
    expect(worldBoundsHeight(bounds)).toBe(8)
  })

  it('calculates a non-empty intersection', () => {
    const left = createWorldBounds(-4, -4, 3, 3)
    const right = createWorldBounds(1, 1, 6, 6)
    expect(intersectsWorldBounds(left, right)).toBe(true)
    expect(intersectWorldBounds(left, right)).toEqual(createWorldBounds(1, 1, 3, 3))
  })

  it('returns null for disjoint or merely touching bounds', () => {
    const left = createWorldBounds(0, 0, 2, 2)
    const right = createWorldBounds(2, 0, 4, 2)
    expect(intersectsWorldBounds(left, right)).toBe(false)
    expect(intersectWorldBounds(left, right)).toBeNull()
  })

  it('expands bounds on every side', () => {
    expect(expandWorldBounds(createWorldBounds(1, 2, 4, 6), 2)).toEqual(
      createWorldBounds(-1, 0, 6, 8),
    )
  })

  it('translates bounds without changing their size', () => {
    const bounds = createWorldBounds(-3, 2, 5, 9)
    expect(translateWorldBounds(bounds, 10, -4)).toEqual(createWorldBounds(7, -2, 15, 5))
  })

  it('creates half-open bounds from points', () => {
    expect(worldBoundsFromPoints([{ x: 2, y: -3 }, { x: -1, y: 5 }, { x: 0, y: 0 }]))
      .toEqual(createWorldBounds(-1, -3, 3, 6))
    expect(worldBoundsFromPoints([])).toBeNull()
  })

  it('represents the maximum world point with an exclusive upper boundary', () => {
    const bounds = createWorldBounds(
      WORLD_COORDINATE_MAX,
      WORLD_COORDINATE_MAX,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
    )
    expect(containsWorldPoint(bounds, {
      x: WORLD_COORDINATE_MAX,
      y: WORLD_COORDINATE_MAX,
    })).toBe(true)
    expect(worldBoundsFromPoints([{
      x: WORLD_COORDINATE_MAX,
      y: WORLD_COORDINATE_MAX,
    }])).toEqual(bounds)
    expect(() => createWorldBounds(
      WORLD_COORDINATE_MAX,
      WORLD_COORDINATE_MAX,
      WORLD_BOUNDARY_MAX_EXCLUSIVE + 1,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
    )).toThrowError(expect.objectContaining({ code: 'WORLD_COORDINATE_OUT_OF_RANGE' }))
  })

  it('rejects reversed and excessively large bounds', () => {
    expect(() => createWorldBounds(2, 0, 1, 1)).toThrowError(
      expect.objectContaining({ code: 'WORLD_BOUNDS_INVALID' }),
    )
    expect(() => createWorldBounds(-1_000_000_000, 0, 1_000_000_002, 1)).toThrowError(
      expect.objectContaining({ code: 'WORLD_COORDINATE_OUT_OF_RANGE' }),
    )
  })

  it('iterates only intersecting positive chunks', () => {
    expect([...iterateChunkCoordinatesForBounds(createWorldBounds(31, 31, 65, 33))]).toEqual([
      { chunkX: 0, chunkY: 0 },
      { chunkX: 1, chunkY: 0 },
      { chunkX: 2, chunkY: 0 },
      { chunkX: 0, chunkY: 1 },
      { chunkX: 1, chunkY: 1 },
      { chunkX: 2, chunkY: 1 },
    ])
  })

  it('iterates negative chunks using floor semantics', () => {
    expect([...iterateChunkCoordinatesForBounds(createWorldBounds(-33, -2, -31, 1))]).toEqual([
      { chunkX: -2, chunkY: -1 },
      { chunkX: -1, chunkY: -1 },
      { chunkX: -2, chunkY: 0 },
      { chunkX: -1, chunkY: 0 },
    ])
  })

  it('iterates chunks across zero', () => {
    expect([...iterateChunkCoordinatesForBounds(createWorldBounds(-1, -1, 1, 1))]).toEqual([
      { chunkX: -1, chunkY: -1 },
      { chunkX: 0, chunkY: -1 },
      { chunkX: -1, chunkY: 0 },
      { chunkX: 0, chunkY: 0 },
    ])
  })

  it('does not iterate chunks for empty bounds', () => {
    expect([...iterateChunkCoordinatesForBounds(createWorldBounds(1, 1, 1, 5))]).toEqual([])
    expect([...iterateChunkCoordinatesForBounds(createWorldBounds(1, 1, 5, 1))]).toEqual([])
  })
})
