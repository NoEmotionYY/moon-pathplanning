import {
  SPARSE_MAP_IMPORT_LIMITS,
  SPARSE_MAP_PLANNING_HINT_LIMITS,
} from '@/config/worldGrid'
import type { MovementMode } from '@/types/grid'
import type {
  SparseGridDocument,
  SparseGridPlanningHint,
  SparseGridTerrainCell,
} from '@/types/sparseGridDocument'
import type { WorldBounds, WorldPointTuple } from '@/types/worldGrid'
import { createWorldBounds } from '@/services/world/worldBounds'
import { worldPointKey } from '@/services/world/worldCoordinates'
import { sparseDocumentError } from './sparseGridDocumentError'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePoint = (value: unknown): WorldPointTuple => {
  if (!Array.isArray(value) || value.length !== 2) {
    throw sparseDocumentError('SPARSE_MAP_COORDINATE_INVALID')
  }
  const point: WorldPointTuple = [value[0] as number, value[1] as number]
  try {
    worldPointKey({ x: point[0], y: point[1] })
  } catch {
    throw sparseDocumentError('SPARSE_MAP_COORDINATE_INVALID')
  }
  return point
}

const pointKey = ([x, y]: WorldPointTuple): string => `${x},${y}`

const parseViewportHint = (value: unknown): WorldBounds | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw sparseDocumentError('SPARSE_MAP_VIEWPORT_HINT_INVALID')
  try {
    return createWorldBounds(
      value.minX as number,
      value.minY as number,
      value.maxX as number,
      value.maxY as number,
    )
  } catch {
    throw sparseDocumentError('SPARSE_MAP_VIEWPORT_HINT_INVALID')
  }
}

const optionalIntegerInRange = (
  value: unknown,
  minimum: number,
  maximum: number,
): number | undefined => {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw sparseDocumentError('SPARSE_MAP_PLANNING_HINT_INVALID')
  }
  return value as number
}

const parsePlanningHint = (value: unknown): SparseGridPlanningHint | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw sparseDocumentError('SPARSE_MAP_PLANNING_HINT_INVALID')
  const margin = optionalIntegerInRange(
    value.margin,
    0,
    SPARSE_MAP_PLANNING_HINT_LIMITS.maximumMargin,
  )
  const maxExpandedNodes = optionalIntegerInRange(
    value.maxExpandedNodes,
    1,
    SPARSE_MAP_PLANNING_HINT_LIMITS.maximumExpandedNodes,
  )
  const timeoutMs = optionalIntegerInRange(
    value.timeoutMs,
    SPARSE_MAP_PLANNING_HINT_LIMITS.minimumTimeoutMs,
    SPARSE_MAP_PLANNING_HINT_LIMITS.maximumTimeoutMs,
  )
  const tracePolicy = value.tracePolicy
  if (
    tracePolicy !== undefined &&
    tracePolicy !== 'full' &&
    tracePolicy !== 'limited' &&
    tracePolicy !== 'disabled'
  ) throw sparseDocumentError('SPARSE_MAP_PLANNING_HINT_INVALID')
  return {
    ...(margin === undefined ? {} : { margin }),
    ...(maxExpandedNodes === undefined ? {} : { maxExpandedNodes }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(tracePolicy === undefined ? {} : { tracePolicy }),
  }
}

export const validateSparseGridDocument = (value: unknown): SparseGridDocument => {
  if (!isRecord(value)) throw sparseDocumentError('SPARSE_MAP_FORMAT_UNSUPPORTED')
  if (value.format !== 'moon-pathplanning.sparse-grid.v1') {
    throw sparseDocumentError('SPARSE_MAP_FORMAT_UNSUPPORTED')
  }
  if (value.movement !== 'four_way' && value.movement !== 'eight_way') {
    throw sparseDocumentError('SPARSE_MAP_FORMAT_UNSUPPORTED')
  }
  if (value.defaultTerrainCost !== 1) {
    throw sparseDocumentError('SPARSE_MAP_DEFAULT_TERRAIN_UNSUPPORTED')
  }
  const start = parsePoint(value.start)
  const goal = parsePoint(value.goal)
  if (pointKey(start) === pointKey(goal)) {
    throw sparseDocumentError('SPARSE_MAP_ENDPOINT_CONFLICT')
  }
  if (!Array.isArray(value.obstacles) || !Array.isArray(value.terrain)) {
    throw sparseDocumentError('SPARSE_MAP_FORMAT_UNSUPPORTED')
  }
  if (value.obstacles.length > SPARSE_MAP_IMPORT_LIMITS.maximumObstacleCount) {
    throw sparseDocumentError('SPARSE_MAP_TOO_MANY_OBSTACLES')
  }
  if (value.terrain.length > SPARSE_MAP_IMPORT_LIMITS.maximumTerrainCount) {
    throw sparseDocumentError('SPARSE_MAP_TOO_MANY_TERRAIN_CELLS')
  }
  if (
    value.obstacles.length + value.terrain.length >
    SPARSE_MAP_IMPORT_LIMITS.maximumNonDefaultCellCount
  ) throw sparseDocumentError('SPARSE_MAP_TOO_MANY_NON_DEFAULT_CELLS')

  const obstacleKeys = new Set<string>()
  const obstacles = value.obstacles.map((entry) => {
    const point = parsePoint(entry)
    const key = pointKey(point)
    if (obstacleKeys.has(key)) throw sparseDocumentError('SPARSE_MAP_DUPLICATE_OBSTACLE')
    obstacleKeys.add(key)
    return point
  })
  if (obstacleKeys.has(pointKey(start)) || obstacleKeys.has(pointKey(goal))) {
    throw sparseDocumentError('SPARSE_MAP_ENDPOINT_BLOCKED')
  }
  const terrainKeys = new Set<string>()
  const terrain: SparseGridTerrainCell[] = value.terrain.map((entry) => {
    if (!isRecord(entry)) throw sparseDocumentError('SPARSE_MAP_TERRAIN_COST_INVALID')
    const point = parsePoint(entry.point)
    const key = pointKey(point)
    if (terrainKeys.has(key)) throw sparseDocumentError('SPARSE_MAP_DUPLICATE_TERRAIN')
    terrainKeys.add(key)
    if (obstacleKeys.has(key)) throw sparseDocumentError('SPARSE_MAP_CELL_CONFLICT')
    if (key === pointKey(start) || key === pointKey(goal)) {
      throw sparseDocumentError('SPARSE_MAP_ENDPOINT_TERRAIN_CONFLICT')
    }
    if (
      !Number.isFinite(entry.cost) ||
      !Number.isInteger(entry.cost) ||
      (entry.cost as number) <= 1
    ) throw sparseDocumentError('SPARSE_MAP_TERRAIN_COST_INVALID')
    return { point, cost: entry.cost as number }
  })
  const viewportHint = parseViewportHint(value.viewportHint)
  const planningHint = parsePlanningHint(value.planningHint)
  return {
    format: 'moon-pathplanning.sparse-grid.v1',
    start,
    goal,
    movement: value.movement as MovementMode,
    defaultTerrainCost: 1,
    obstacles,
    terrain,
    ...(viewportHint === undefined ? {} : { viewportHint }),
    ...(planningHint === undefined ? {} : { planningHint }),
  }
}
