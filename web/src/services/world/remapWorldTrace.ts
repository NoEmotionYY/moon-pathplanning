import type { TraceBatchMessage } from '@/types/planner'
import type { SearchEvent, SearchTrace } from '@/types/trace'
import type {
  MaterializedSparsePlanningWindow,
  WorldSearchEvent,
  WorldSearchTrace,
  WorldTraceBatchMessage,
} from '@/types/worldPlanning'
import { remapLocalPointToWorld } from './remapPlanningCoordinates'
import { SparsePlanningError, sparsePlanningError } from './sparsePlanningError'

export function remapSearchEventToWorld(
  event: SearchEvent,
  materialized: MaterializedSparsePlanningWindow,
): WorldSearchEvent {
  try {
    return { ...event, point: remapLocalPointToWorld(materialized, event.point) }
  } catch (error) {
    if (error instanceof SparsePlanningError) {
      throw sparsePlanningError('SPARSE_PLANNING_TRACE_POINT_OUT_OF_BOUNDS', {
        point: [...event.point],
      })
    }
    throw error
  }
}

export function remapSearchTraceToWorld(
  trace: SearchTrace,
  materialized: MaterializedSparsePlanningWindow,
): WorldSearchTrace {
  return {
    ...trace,
    events: trace.events.map((event) => remapSearchEventToWorld(event, materialized)),
  }
}

export function remapTraceBatchToWorld(
  message: TraceBatchMessage,
  materialized: MaterializedSparsePlanningWindow,
): WorldTraceBatchMessage {
  return {
    ...message,
    events: message.events.map((event) => remapSearchEventToWorld(event, materialized)),
    sourceWorldVersion: materialized.sourceWorldVersion,
    worldBounds: { ...materialized.worldBounds },
  }
}
