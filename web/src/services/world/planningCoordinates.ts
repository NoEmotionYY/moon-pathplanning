import type {
  PlanningCoordinateTransform,
  PlanningPoint,
  WorldBounds,
  WorldPoint,
} from '@/types/worldGrid'
import { containsWorldPoint, createWorldBounds, worldBoundsHeight, worldBoundsWidth } from './worldBounds'
import { createWorldGridError } from './worldGridError'

const isIntegerPoint = (point: { readonly x: number; readonly y: number }): boolean =>
  Number.isFinite(point.x) &&
  Number.isFinite(point.y) &&
  Number.isInteger(point.x) &&
  Number.isInteger(point.y)

export const createPlanningCoordinateTransform = (
  bounds: WorldBounds,
): PlanningCoordinateTransform => {
  const validBounds = createWorldBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
  return {
    bounds: validBounds,
    width: worldBoundsWidth(validBounds),
    height: worldBoundsHeight(validBounds),
    worldOrigin: { x: validBounds.minX, y: validBounds.minY },
  }
}

export const isWorldPointInsidePlanningWindow = (
  transform: PlanningCoordinateTransform,
  worldPoint: WorldPoint,
): boolean => containsWorldPoint(transform.bounds, worldPoint)

export const isPlanningPointInsideBounds = (
  transform: PlanningCoordinateTransform,
  localPoint: PlanningPoint,
): boolean =>
  isIntegerPoint(localPoint) &&
  localPoint.x >= 0 &&
  localPoint.y >= 0 &&
  localPoint.x < transform.width &&
  localPoint.y < transform.height

export const worldToPlanningPoint = (
  transform: PlanningCoordinateTransform,
  worldPoint: WorldPoint,
): PlanningPoint => {
  if (!isWorldPointInsidePlanningWindow(transform, worldPoint)) {
    throw createWorldGridError('PLANNING_POINT_OUT_OF_BOUNDS')
  }
  return {
    x: worldPoint.x - transform.bounds.minX,
    y: worldPoint.y - transform.bounds.minY,
  }
}

export const planningToWorldPoint = (
  transform: PlanningCoordinateTransform,
  localPoint: PlanningPoint,
): WorldPoint => {
  if (!isPlanningPointInsideBounds(transform, localPoint)) {
    throw createWorldGridError('PLANNING_POINT_OUT_OF_BOUNDS')
  }
  return {
    x: localPoint.x + transform.bounds.minX,
    y: localPoint.y + transform.bounds.minY,
  }
}

