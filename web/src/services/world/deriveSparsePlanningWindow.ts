import {
  SPARSE_PLANNING_WINDOW_LIMITS,
  WORLD_BOUNDARY_MAX_EXCLUSIVE,
  WORLD_BOUNDARY_MIN,
} from '@/config/worldGrid'
import type { SparseGridWorld } from './SparseGridWorld'
import type { SparsePlanningWindowRequest } from '@/types/worldPlanning'
import { createWorldBounds } from './worldBounds'
import { sparsePlanningError, type SparsePlanningErrorCode } from './sparsePlanningError'
import { assessSparsePlanningWindow } from './sparsePlanningWindowCapability'

export interface DeriveSparsePlanningWindowOptions {
  readonly margin?: number
  readonly tracePolicy?: 'full' | 'limited' | 'disabled'
  readonly maxExpandedNodes?: number
  readonly timeoutMs?: number
}

const deriveAxis = (
  first: number,
  second: number,
  margin: number,
): readonly [number, number] => {
  const pointMin = Math.min(first, second)
  const pointMaxExclusive = Math.max(first, second) + 1
  const span = pointMaxExclusive - pointMin
  if (span > SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumDimension) {
    throw sparsePlanningError('SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE', { span })
  }
  const dimension = Math.min(
    SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumDimension,
    Math.max(
      SPARSE_PLANNING_WINDOW_LIMITS.minimumDimension,
      span + margin * 2,
    ),
  )
  const extra = dimension - span
  let min = pointMin - Math.floor(extra / 2)
  let max = min + dimension
  if (min < WORLD_BOUNDARY_MIN) {
    min = WORLD_BOUNDARY_MIN
    max = min + dimension
  }
  if (max > WORLD_BOUNDARY_MAX_EXCLUSIVE) {
    max = WORLD_BOUNDARY_MAX_EXCLUSIVE
    min = max - dimension
  }
  return [min, max]
}

export function deriveSparsePlanningWindow(
  world: SparseGridWorld,
  options: DeriveSparsePlanningWindowOptions = {},
): SparsePlanningWindowRequest {
  const margin = options.margin ?? SPARSE_PLANNING_WINDOW_LIMITS.defaultMargin
  if (
    !Number.isInteger(margin) ||
    margin < 0 ||
    margin > SPARSE_PLANNING_WINDOW_LIMITS.maximumMargin
  ) throw sparsePlanningError('SPARSE_PLANNING_WINDOW_INVALID', { margin })
  const start = world.start
  const goal = world.goal
  const [minX, maxX] = deriveAxis(start.x, goal.x, margin)
  const [minY, maxY] = deriveAxis(start.y, goal.y, margin)
  const request: SparsePlanningWindowRequest = {
    bounds: createWorldBounds(minX, minY, maxX, maxY),
    ...(options.maxExpandedNodes === undefined ? {} : {
      maxExpandedNodes: options.maxExpandedNodes,
    }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.tracePolicy === undefined ? {} : { tracePolicy: options.tracePolicy }),
  }
  const capability = assessSparsePlanningWindow(request)
  if (!capability.allowed) {
    throw sparsePlanningError(
      capability.error?.code as SparsePlanningErrorCode ?? 'SPARSE_PLANNING_WINDOW_INVALID',
      { capability },
    )
  }
  return request
}
