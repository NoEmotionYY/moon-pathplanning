import type { GridMapDocument, PointTuple } from '@/types/grid'
import type {
  MapImportSnapshot,
  PlannerImportState,
} from '@/types/mapImportTransaction'
import type {
  AlgorithmId,
  PlannerError,
  PlannerResult,
  PlannerStatus,
} from '@/types/planner'
import type { PlaybackStatus, SearchEvent, TraceMode } from '@/types/trace'

export interface GridSnapshotSource {
  version: number
  dirty: boolean
  toDocument(): GridMapDocument
}

export interface PlannerSnapshotSource {
  selectedAlgorithm: AlgorithmId
  status: PlannerStatus
  result: PlannerResult | null
  error: PlannerError | null
  executionTime: number | null
  resultVersion: number | null
  currentRequestId: string | null
  requestGeneration: number
  traceSupported: boolean
  traceMode: TraceMode
  traceEvents: SearchEvent[]
  traceTotalSteps: number
  traceReceivedSteps: number
  traceRequestId: string | null
  traceMapVersion: number | null
  traceAlgorithm: AlgorithmId | null
  playbackStatus: PlaybackStatus
  playbackSpeed: number
  currentEventIndex: number
  visitedCells: Set<string>
  expandedCells: Set<string>
  frontierCells: Set<string>
  currentCell: PointTuple | null
}

function clonePoint(point: PointTuple): PointTuple {
  return [point[0], point[1]]
}

function cloneSearchEvent(event: SearchEvent): SearchEvent {
  return {
    ...event,
    point: clonePoint(event.point),
  }
}

function cloneGridDocument(document: GridMapDocument): GridMapDocument {
  return {
    ...document,
    start: clonePoint(document.start),
    goal: clonePoint(document.goal),
    obstacles: document.obstacles.map(clonePoint),
    terrain: document.terrain.map((cell) => ({
      point: clonePoint(cell.point),
      cost: cell.cost,
    })),
  }
}

function clonePlannerResult(result: PlannerResult | null): PlannerResult | null {
  if (!result) return null
  return {
    ...result,
    path: result.path.map(clonePoint),
    trace: result.trace
      ? {
          ...result.trace,
          events: result.trace.events.map(cloneSearchEvent),
        }
      : undefined,
    error: result.error ? { ...result.error } : null,
  }
}

function clonePlannerState(source: PlannerSnapshotSource): PlannerImportState {
  return {
    selectedAlgorithm: source.selectedAlgorithm,
    status: source.status,
    result: clonePlannerResult(source.result),
    error: source.error ? { ...source.error } : null,
    executionTime: source.executionTime,
    resultVersion: source.resultVersion,
    currentRequestId: source.currentRequestId,
    requestGeneration: source.requestGeneration,
    trace: {
      supported: source.traceSupported,
      mode: source.traceMode,
      events: source.traceEvents.map(cloneSearchEvent),
      totalSteps: source.traceTotalSteps,
      receivedSteps: source.traceReceivedSteps,
      requestId: source.traceRequestId,
      mapVersion: source.traceMapVersion,
      algorithm: source.traceAlgorithm,
    },
    playback: {
      status: source.playbackStatus,
      speed: source.playbackSpeed,
      currentEventIndex: source.currentEventIndex,
      visitedCells: new Set(source.visitedCells),
      expandedCells: new Set(source.expandedCells),
      frontierCells: new Set(source.frontierCells),
      currentCell: source.currentCell ? clonePoint(source.currentCell) : null,
    },
  }
}

export function captureMapImportSnapshot(
  grid: GridSnapshotSource,
  planner: PlannerSnapshotSource,
): MapImportSnapshot {
  return {
    grid: {
      document: cloneGridDocument(grid.toDocument()),
      mapVersion: grid.version,
      dirty: grid.dirty,
    },
    planner: clonePlannerState(planner),
  }
}
