import type { MaterializedSparsePlanningWindow } from '@/types/worldPlanning'
import { sparsePlanningError } from './sparsePlanningError'

export function isSparsePlanningContextStale(
  materialized: MaterializedSparsePlanningWindow,
  currentWorldVersion: number,
): boolean {
  return materialized.sourceWorldVersion !== currentWorldVersion
}

export function assertSparsePlanningContextCurrent(
  materialized: MaterializedSparsePlanningWindow,
  currentWorldVersion: number,
): void {
  if (isSparsePlanningContextStale(materialized, currentWorldVersion)) {
    throw sparsePlanningError('SPARSE_PLANNING_WORLD_VERSION_STALE', {
      sourceWorldVersion: materialized.sourceWorldVersion,
      currentWorldVersion,
    })
  }
}
