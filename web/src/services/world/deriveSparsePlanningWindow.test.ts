import { describe, expect, it } from 'vitest'
import {
  WORLD_BOUNDARY_MAX_EXCLUSIVE,
  WORLD_BOUNDARY_MIN,
  WORLD_COORDINATE_MAX,
  WORLD_COORDINATE_MIN,
} from '@/config/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { deriveSparsePlanningWindow } from './deriveSparsePlanningWindow'
import { containsWorldPoint, worldBoundsHeight, worldBoundsWidth } from './worldBounds'

const world = (startX: number, startY: number, goalX: number, goalY: number) =>
  SparseGridWorld.create({
    start: { x: startX, y: startY },
    goal: { x: goalX, y: goalY },
  })

describe('derive sparse planning window', () => {
  it.each([
    [10, 10, 20, 20],
    [-20, -10, -5, -2],
    [-2, -3, 2, 3],
  ])('contains endpoints for ordinary coordinates', (sx, sy, gx, gy) => {
    const source = world(sx, sy, gx, gy)
    const result = deriveSparsePlanningWindow(source)
    expect(containsWorldPoint(result.bounds, source.start)).toBe(true)
    expect(containsWorldPoint(result.bounds, source.goal)).toBe(true)
  })

  it('uses default margin and supports margin zero', () => {
    expect(worldBoundsWidth(deriveSparsePlanningWindow(world(0, 0, 1, 1)).bounds)).toBe(34)
    const zero = deriveSparsePlanningWindow(world(0, 0, 1, 1), { margin: 0 })
    expect(worldBoundsWidth(zero.bounds)).toBe(5)
    expect(worldBoundsHeight(zero.bounds)).toBe(5)
  })

  it.each([
    {
      source: world(
        WORLD_COORDINATE_MIN,
        WORLD_COORDINATE_MIN,
        WORLD_COORDINATE_MIN,
        WORLD_COORDINATE_MIN + 1,
      ),
      expectedMin: WORLD_BOUNDARY_MIN,
      endpoint: WORLD_COORDINATE_MIN,
    },
    {
      source: world(
        WORLD_COORDINATE_MAX,
        WORLD_COORDINATE_MAX,
        WORLD_COORDINATE_MAX,
        WORLD_COORDINATE_MAX - 1,
      ),
      expectedMin: WORLD_COORDINATE_MAX - 4,
      endpoint: WORLD_COORDINATE_MAX,
    },
  ])('shifts a 5×5 window at world edge', ({ source, expectedMin, endpoint }) => {
    const bounds = deriveSparsePlanningWindow(source, { margin: 0 }).bounds
    expect(bounds.minX).toBe(expectedMin)
    expect(bounds.maxX).toBe(expectedMin + 5)
    expect(containsWorldPoint(bounds, { x: endpoint, y: endpoint })).toBe(true)
  })

  it('uses MAX+1 as the exclusive boundary', () => {
    const bounds = deriveSparsePlanningWindow(
      world(WORLD_COORDINATE_MAX - 1, 0, WORLD_COORDINATE_MAX, 1),
      { margin: 0 },
    ).bounds
    expect(bounds.maxX).toBe(WORLD_BOUNDARY_MAX_EXCLUSIVE)
  })

  it('accepts endpoint span 151 and rejects span 152', () => {
    expect(worldBoundsWidth(deriveSparsePlanningWindow(world(0, 0, 150, 0)).bounds)).toBe(151)
    expect(() => deriveSparsePlanningWindow(world(0, 0, 151, 0))).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE' }),
    )
    expect(() => deriveSparsePlanningWindow(world(0, 0, 0, 151))).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE' }),
    )
  })

  it('rejects extremely distant endpoints without allocating their span', () => {
    const source = world(WORLD_COORDINATE_MIN, 0, WORLD_COORDINATE_MAX, 0)
    expect(() => deriveSparsePlanningWindow(source)).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE' }),
    )
    expect(source.chunkCount).toBe(0)
  })

  it.each([-1, 4097, 1.5])('rejects invalid margin %s', (margin) => {
    expect(() => deriveSparsePlanningWindow(world(0, 0, 1, 1), { margin })).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_WINDOW_INVALID' }),
    )
  })
})
