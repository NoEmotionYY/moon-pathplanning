import type { PlannerResult } from '@/types/planner'
import type {
  MaterializedSparsePlanningWindow,
  WorldPlannerResult,
  WorldPlannerResultStatus,
} from '@/types/worldPlanning'
import { remapLocalPathToWorld } from './remapPlanningCoordinates'
import { remapSearchTraceToWorld } from './remapWorldTrace'

export function remapPlannerResultToWorld(
  result: PlannerResult,
  materialized: MaterializedSparsePlanningWindow,
): WorldPlannerResult {
  const status: WorldPlannerResultStatus =
    result.status === 'no_path' ? 'no_path_in_window' : result.status
  return {
    ...result,
    status,
    path: remapLocalPathToWorld(materialized, result.path),
    ...(result.trace === undefined
      ? {}
      : { trace: remapSearchTraceToWorld(result.trace, materialized) }),
    sourceWorldVersion: materialized.sourceWorldVersion,
    worldBounds: { ...materialized.worldBounds },
    globallyConclusive: status !== 'no_path_in_window',
  }
}
