import { SPARSE_PLANNING_WINDOW_LIMITS } from '@/config/worldGrid'
import type { GridMapDocument, PointTuple, TerrainCell } from '@/types/grid'
import type {
  MaterializedSparsePlanningWindow,
  SparsePlanningWindowRequest,
} from '@/types/worldPlanning'
import { validateGridDocument } from '@/utils/validation'
import type { SparseGridWorld } from './SparseGridWorld'
import {
  createPlanningCoordinateTransform,
  worldToPlanningPoint,
} from './planningCoordinates'
import { sparsePlanningError, type SparsePlanningErrorCode } from './sparsePlanningError'
import { assessSparsePlanningWindow } from './sparsePlanningWindowCapability'
import { visitSparseWorldCellsInBounds } from './sparseWorldIteration'
import { containsWorldPoint, iterateChunkCoordinatesForBounds } from './worldBounds'

const byYThenX = (left: PointTuple, right: PointTuple): number =>
  left[1] - right[1] || left[0] - right[0]

export function materializeSparsePlanningWindow(
  world: SparseGridWorld,
  request: SparsePlanningWindowRequest,
): MaterializedSparsePlanningWindow {
  const capability = assessSparsePlanningWindow(request)
  if (!capability.allowed) {
    throw sparsePlanningError(
      capability.error?.code as SparsePlanningErrorCode ?? 'SPARSE_PLANNING_WINDOW_INVALID',
      { capability },
    )
  }
  const bounds = { ...request.bounds }
  if (!containsWorldPoint(bounds, world.start)) {
    throw sparsePlanningError('SPARSE_PLANNING_START_OUTSIDE_WINDOW')
  }
  if (!containsWorldPoint(bounds, world.goal)) {
    throw sparsePlanningError('SPARSE_PLANNING_GOAL_OUTSIDE_WINDOW')
  }
  const transform = createPlanningCoordinateTransform(bounds)
  const obstacles: PointTuple[] = []
  const terrain: TerrainCell[] = []
  visitSparseWorldCellsInBounds(world, bounds, (cell) => {
    const local = worldToPlanningPoint(transform, cell.point)
    const tuple: PointTuple = [local.x, local.y]
    if (cell.blocked) obstacles.push(tuple)
    else if (cell.terrainCost !== 1) terrain.push({ point: tuple, cost: cell.terrainCost })
  })
  obstacles.sort(byYThenX)
  terrain.sort((left, right) => byYThenX(left.point, right.point))
  const localStart = worldToPlanningPoint(transform, world.start)
  const localGoal = worldToPlanningPoint(transform, world.goal)
  const document: GridMapDocument = {
    format: 'moon-pathplanning.grid.v1',
    width: capability.width,
    height: capability.height,
    start: [localStart.x, localStart.y],
    goal: [localGoal.x, localGoal.y],
    movement: world.movement,
    obstacles,
    terrain,
  }
  try {
    validateGridDocument(document, {
      maximumSize: SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumDimension,
    })
  } catch (error) {
    throw sparsePlanningError('SPARSE_PLANNING_MATERIALIZATION_FAILED', {
      reason: error instanceof Error ? error.message : '未知校验错误',
    })
  }
  let intersectingChunkCount = 0
  for (const _coordinate of iterateChunkCoordinatesForBounds(bounds)) {
    intersectingChunkCount += 1
  }
  const requestCopy: SparsePlanningWindowRequest = {
    ...request,
    bounds: { ...bounds },
  }
  return {
    document,
    transform: {
      ...transform,
      bounds: { ...transform.bounds },
      worldOrigin: { ...transform.worldOrigin },
    },
    worldBounds: { ...bounds },
    sourceWorldVersion: world.worldVersion,
    request: requestCopy,
    capability: {
      ...capability,
      warnings: [...capability.warnings],
      error: capability.error ? { ...capability.error } : null,
    },
    metrics: {
      width: capability.width,
      height: capability.height,
      cellCount: capability.cellCount,
      obstacleCount: obstacles.length,
      terrainCount: terrain.length,
      sourceWorldVersion: world.worldVersion,
      intersectingChunkCount,
    },
  }
}
