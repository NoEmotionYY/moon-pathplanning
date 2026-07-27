import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type {
  AlgorithmId,
  PlannerError,
  PlannerResult,
  PlannerStatus,
  TraceBatchMessage,
} from '@/types/planner'
import type { PlaybackStatus, SearchEvent, TraceMode } from '@/types/trace'
import type { PointTuple } from '@/types/grid'

export const usePlannerStore = defineStore('planner', () => {
  const selectedAlgorithm = ref<AlgorithmId>('astar')
  const status = ref<PlannerStatus>('idle')
  const result = ref<PlannerResult | null>(null)
  const error = ref<PlannerError | null>(null)
  const executionTime = ref<number | null>(null)
  const currentRequestId = ref<string | null>(null)
  const isRunning = computed(() => status.value === 'running')
  const resultVersion = ref<number | null>(null)

  const traceSupported = ref(false)
  const traceMode = ref<TraceMode>('none')
  const traceEvents = shallowRef<SearchEvent[]>([])
  const traceTotalSteps = ref(0)
  const traceReceivedSteps = ref(0)
  const currentEventIndex = ref(-1)
  const playbackStatus = ref<PlaybackStatus>('idle')
  const playbackSpeed = ref(1)
  const visitedCells = shallowRef<Set<string>>(new Set())
  const expandedCells = shallowRef<Set<string>>(new Set())
  const frontierCells = shallowRef<Set<string>>(new Set())
  const currentCell = ref<PointTuple | null>(null)
  const traceRequestId = ref<string | null>(null)
  const traceMapVersion = ref<number | null>(null)
  const traceAlgorithm = ref<AlgorithmId | null>(null)
  const cancelledRequestIds = new Set<string>()

  function clearPlaybackCells(): void {
    currentEventIndex.value = -1
    visitedCells.value = new Set()
    expandedCells.value = new Set()
    frontierCells.value = new Set()
    currentCell.value = null
  }

  function clearTrace(): void {
    traceSupported.value = false
    traceMode.value = 'none'
    traceEvents.value = []
    traceTotalSteps.value = 0
    traceReceivedSteps.value = 0
    playbackStatus.value = 'idle'
    traceRequestId.value = null
    traceMapVersion.value = null
    traceAlgorithm.value = null
    clearPlaybackCells()
  }

  function begin(requestId: string, mapVersion: number, algorithm: AlgorithmId): void {
    if (currentRequestId.value) cancelledRequestIds.add(currentRequestId.value)
    clearTrace()
    currentRequestId.value = requestId
    traceRequestId.value = requestId
    traceMapVersion.value = mapVersion
    traceAlgorithm.value = algorithm
    cancelledRequestIds.delete(requestId)
    status.value = 'running'
    error.value = null
    result.value = null
    executionTime.value = null
    resultVersion.value = null
  }

  function requestMatches(
    requestId: string,
    mapVersion: number,
    algorithm: AlgorithmId,
  ): boolean {
    return (
      currentRequestId.value === requestId &&
      traceRequestId.value === requestId &&
      traceMapVersion.value === mapVersion &&
      traceAlgorithm.value === algorithm &&
      selectedAlgorithm.value === algorithm &&
      !cancelledRequestIds.has(requestId)
    )
  }

  function appendTraceBatch(
    message: TraceBatchMessage,
    mapVersion: number,
    algorithm: AlgorithmId,
  ): boolean {
    if (!requestMatches(message.requestId, mapVersion, algorithm)) return false
    if (message.offset !== traceReceivedSteps.value) return false
    traceSupported.value = message.supported
    traceMode.value = message.mode
    traceTotalSteps.value = message.totalSteps
    if (message.events.length) {
      traceEvents.value = [...traceEvents.value, ...message.events]
      traceReceivedSteps.value += message.events.length
    }
    return true
  }

  function complete(
    requestId: string,
    value: PlannerResult,
    elapsed: number,
    mapVersion: number,
    algorithm: AlgorithmId,
  ): boolean {
    if (!requestMatches(requestId, mapVersion, algorithm)) return false
    result.value = value
    executionTime.value = elapsed
    resultVersion.value = mapVersion
    error.value = value.error
    status.value = value.status
    currentRequestId.value = null
    if (traceSupported.value && traceEvents.value.length > 0) {
      traceTotalSteps.value = traceEvents.value.length
      playbackStatus.value = 'ready'
    } else {
      playbackStatus.value = 'idle'
    }
    return true
  }

  function fail(requestId: string, nextError: PlannerError): boolean {
    if (currentRequestId.value !== requestId || cancelledRequestIds.has(requestId)) return false
    error.value = nextError
    status.value = 'error'
    currentRequestId.value = null
    clearTrace()
    return true
  }

  function cancelRequest(requestId: string): void {
    cancelledRequestIds.add(requestId)
    if (currentRequestId.value === requestId) currentRequestId.value = null
  }

  function applyTraceIndex(index: number): void {
    const bounded = Math.min(Math.max(index, -1), traceEvents.value.length - 1)
    const visited = new Set<string>()
    const expanded = new Set<string>()
    const frontier = new Set<string>()
    let current: PointTuple | null = null
    for (let eventIndex = 0; eventIndex <= bounded; eventIndex += 1) {
      const event = traceEvents.value[eventIndex]
      if (!event) continue
      const key = `${event.point[0]},${event.point[1]}`
      if (event.kind === 'discovered') {
        visited.add(key)
        frontier.add(key)
      } else if (event.kind === 'expanded') {
        visited.add(key)
        frontier.delete(key)
        expanded.add(key)
        current = event.point
      } else {
        current = event.point
      }
    }
    currentEventIndex.value = bounded
    visitedCells.value = visited
    expandedCells.value = expanded
    frontierCells.value = frontier
    currentCell.value = current
    if (bounded >= traceEvents.value.length - 1 && traceEvents.value.length > 0) {
      playbackStatus.value = 'finished'
    }
  }

  function invalidateForMapChange(): string | null {
    const requestId = currentRequestId.value
    if (requestId) cancelRequest(requestId)
    const hadResult = Boolean(result.value)
    result.value = null
    error.value = null
    executionTime.value = null
    resultVersion.value = null
    if (hadResult) status.value = 'stale'
    else if (status.value !== 'error') status.value = 'idle'
    clearTrace()
    return requestId
  }

  function clearResult(): void {
    result.value = null
    error.value = null
    executionTime.value = null
    resultVersion.value = null
    currentRequestId.value = null
    status.value = 'idle'
    clearTrace()
  }

  return {
    selectedAlgorithm,
    status,
    result,
    error,
    executionTime,
    currentRequestId,
    isRunning,
    resultVersion,
    traceSupported,
    traceMode,
    traceEvents,
    traceTotalSteps,
    traceReceivedSteps,
    currentEventIndex,
    playbackStatus,
    playbackSpeed,
    visitedCells,
    expandedCells,
    frontierCells,
    currentCell,
    traceRequestId,
    traceMapVersion,
    traceAlgorithm,
    begin,
    appendTraceBatch,
    complete,
    fail,
    cancelRequest,
    applyTraceIndex,
    invalidateForMapChange,
    clearTrace,
    clearResult,
  }
})
