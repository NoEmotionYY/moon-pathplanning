import type { PointTuple } from '@/types/grid'
import type { MaterializedSparsePlanningWindow } from '@/types/worldPlanning'
import type { WorldPointTuple } from '@/types/worldGrid'
import {
  isPlanningPointInsideBounds,
  isWorldPointInsidePlanningWindow,
  planningToWorldPoint,
  worldToPlanningPoint,
} from './planningCoordinates'
import { sparsePlanningError } from './sparsePlanningError'

export function remapLocalPointToWorld(
  materialized: MaterializedSparsePlanningWindow,
  point: PointTuple,
): WorldPointTuple {
  const local = { x: point[0], y: point[1] }
  if (!isPlanningPointInsideBounds(materialized.transform, local)) {
    throw sparsePlanningError('SPARSE_PLANNING_RESULT_POINT_OUT_OF_BOUNDS', { point: [...point] })
  }
  const world = planningToWorldPoint(materialized.transform, local)
  return [world.x, world.y]
}

export function remapWorldPointToLocal(
  materialized: MaterializedSparsePlanningWindow,
  point: WorldPointTuple,
): PointTuple {
  const world = { x: point[0], y: point[1] }
  if (!isWorldPointInsidePlanningWindow(materialized.transform, world)) {
    throw sparsePlanningError('SPARSE_PLANNING_RESULT_POINT_OUT_OF_BOUNDS', { point: [...point] })
  }
  const local = worldToPlanningPoint(materialized.transform, world)
  return [local.x, local.y]
}

export function remapLocalPathToWorld(
  materialized: MaterializedSparsePlanningWindow,
  path: readonly PointTuple[],
): WorldPointTuple[] {
  return path.map((point) => remapLocalPointToWorld(materialized, point))
}
