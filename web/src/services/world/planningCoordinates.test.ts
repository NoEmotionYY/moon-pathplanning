import { describe, expect, it } from 'vitest'
import { WORLD_BOUNDARY_MAX_EXCLUSIVE, WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import { createWorldBounds } from './worldBounds'
import {
  createPlanningCoordinateTransform,
  isPlanningPointInsideBounds,
  isWorldPointInsidePlanningWindow,
  planningToWorldPoint,
  worldToPlanningPoint,
} from './planningCoordinates'

describe('planning coordinates', () => {
  it('creates dimensions and converts world coordinates to local coordinates', () => {
    const transform = createPlanningCoordinateTransform(createWorldBounds(10, 20, 15, 27))
    expect(transform).toMatchObject({ width: 5, height: 7, worldOrigin: { x: 10, y: 20 } })
    expect(worldToPlanningPoint(transform, { x: 12, y: 25 })).toEqual({ x: 2, y: 5 })
  })

  it('converts local coordinates back to world coordinates', () => {
    const transform = createPlanningCoordinateTransform(createWorldBounds(10, 20, 15, 27))
    expect(planningToWorldPoint(transform, { x: 2, y: 5 })).toEqual({ x: 12, y: 25 })
  })

  it('supports a negative world origin and round trips exactly', () => {
    const transform = createPlanningCoordinateTransform(createWorldBounds(-40, -70, -8, -6))
    const worldPoint = { x: -33, y: -32 }
    expect(planningToWorldPoint(transform, worldToPlanningPoint(transform, worldPoint)))
      .toEqual(worldPoint)
  })

  it('round trips the maximum world point', () => {
    const transform = createPlanningCoordinateTransform(
      createWorldBounds(
        WORLD_COORDINATE_MAX,
        WORLD_COORDINATE_MAX,
        WORLD_BOUNDARY_MAX_EXCLUSIVE,
        WORLD_BOUNDARY_MAX_EXCLUSIVE,
      ),
    )
    const point = { x: WORLD_COORDINATE_MAX, y: WORLD_COORDINATE_MAX }
    expect(planningToWorldPoint(transform, worldToPlanningPoint(transform, point))).toEqual(point)
  })

  it('uses half-open predicates for world and planning points', () => {
    const transform = createPlanningCoordinateTransform(createWorldBounds(-2, -3, 2, 3))
    expect(isWorldPointInsidePlanningWindow(transform, { x: -2, y: -3 })).toBe(true)
    expect(isWorldPointInsidePlanningWindow(transform, { x: 2, y: 0 })).toBe(false)
    expect(isPlanningPointInsideBounds(transform, { x: 3, y: 5 })).toBe(true)
    expect(isPlanningPointInsideBounds(transform, { x: 4, y: 5 })).toBe(false)
  })

  it('rejects world and local points outside the window without clamping', () => {
    const transform = createPlanningCoordinateTransform(createWorldBounds(10, 20, 15, 27))
    expect(() => worldToPlanningPoint(transform, { x: 15, y: 21 })).toThrowError(
      expect.objectContaining({ code: 'PLANNING_POINT_OUT_OF_BOUNDS' }),
    )
    expect(() => planningToWorldPoint(transform, { x: -1, y: 0 })).toThrowError(
      expect.objectContaining({ code: 'PLANNING_POINT_OUT_OF_BOUNDS' }),
    )
  })

  it('does not modify transform or point inputs', () => {
    const bounds = Object.freeze(createWorldBounds(-4, -4, 4, 4))
    const transform = Object.freeze(createPlanningCoordinateTransform(bounds))
    const worldPoint = Object.freeze({ x: -1, y: 2 })
    const localPoint = worldToPlanningPoint(transform, worldPoint)
    planningToWorldPoint(transform, Object.freeze(localPoint))
    expect(bounds).toEqual({ minX: -4, minY: -4, maxX: 4, maxY: 4 })
    expect(worldPoint).toEqual({ x: -1, y: 2 })
  })
})
