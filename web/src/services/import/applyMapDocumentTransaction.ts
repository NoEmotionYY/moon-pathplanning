import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import { playbackFrameController } from '@/services/playbackFrameController'
import { plannerWorkerClient } from '@/services/plannerWorkerClient'
import type { useGridStore } from '@/stores/grid'
import type { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument, PointTuple } from '@/types/grid'
import type {
  GridMapImportState,
  MapImportCapability,
  MapImportSnapshot,
  MapImportTransactionMetrics,
  MapImportTransactionOptions,
  MapImportTransactionResult,
  PlannerImportState,
} from '@/types/mapImportTransaction'
import { validateGridDocument } from '@/utils/validation'
import { getMapImportCapability } from './mapImportCapability'
import {
  captureMapImportSnapshot,
  type GridSnapshotSource,
  type PlannerSnapshotSource,
} from './mapImportSnapshot'

type GridStore = ReturnType<typeof useGridStore>
type PlannerStore = ReturnType<typeof usePlannerStore>

export interface MapImportGridPort extends GridSnapshotSource {
  applyGridMapDocument(
    document: GridMapDocument,
    options?: { incrementVersion?: boolean; dirty?: boolean },
  ): void
  restoreGridMapSnapshot(snapshot: GridMapImportState): void
}

export interface MapImportPlannerPort extends PlannerSnapshotSource {
  plannerStartsBlocked: boolean
  setPlannerStartsBlocked(blocked: boolean): void
  invalidateRequestsForImport(): string | null
  clearForImportedMap(options: {
    preserveSelectedAlgorithm: boolean
    preservePlaybackSpeed: boolean
  }): void
  restorePlannerImportState(snapshot: PlannerImportState): void
}

export type MapImportTransactionStage = 'after-map-apply'

export interface MapImportTransactionDependencies {
  grid: MapImportGridPort
  planner: MapImportPlannerPort
  hardCancelPlanner(requestId: string | null): void | Promise<void>
  stopTracePlayback(): boolean
  capability?(document: GridMapDocument): MapImportCapability
  now?(): number
  faultInjector?(stage: MapImportTransactionStage): void | Promise<void>
}

class MapImportTransactionFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

let transactionLocked = false

function pointKey(point: PointTuple): string {
  return `${point[0]},${point[1]}`
}

function validateTransactionDocument(value: unknown): GridMapDocument {
  try {
    validateGridDocument(value, { maximumSize: MAP_SIZE_LIMITS.hardMax })
  } catch (error) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_INVALID_DOCUMENT',
      error instanceof Error ? error.message : '地图文档无效。',
    )
  }

  const document = value
  const obstacleKeys = document.obstacles.map(pointKey)
  if (new Set(obstacleKeys).size !== obstacleKeys.length) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_DUPLICATE_OBSTACLE',
      '地图文档包含重复的障碍物坐标。',
    )
  }

  const terrainKeys = document.terrain.map((cell) => pointKey(cell.point))
  if (new Set(terrainKeys).size !== terrainKeys.length) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_DUPLICATE_TERRAIN',
      '地图文档包含重复的地形坐标。',
    )
  }
  if (document.terrain.some((cell) => !Number.isFinite(cell.cost))) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_NON_FINITE_TERRAIN_COST',
      '地形代价必须是有限数值。',
    )
  }

  const obstacleSet = new Set(obstacleKeys)
  const endpointKeys = new Set([
    pointKey(document.start),
    pointKey(document.goal),
  ])
  if (pointKey(document.start) === pointKey(document.goal)) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_ENDPOINT_CONFLICT',
      '起点和终点不能位于同一单元格。',
    )
  }
  if (
    terrainKeys.some((key) => obstacleSet.has(key) || endpointKeys.has(key))
  ) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_CELL_CONFLICT',
      '地形不能与障碍物、起点或终点重叠。',
    )
  }
  return document
}

function documentSignature(document: GridMapDocument): string {
  const obstacles = document.obstacles.map(pointKey).sort()
  const terrain = document.terrain
    .map((cell) => `${pointKey(cell.point)}:${cell.cost}`)
    .sort()
  return JSON.stringify({
    format: document.format,
    width: document.width,
    height: document.height,
    start: document.start,
    goal: document.goal,
    movement: document.movement,
    obstacles,
    terrain,
  })
}

function assertPostconditions(
  expected: GridMapDocument,
  previousVersion: number,
  dependencies: MapImportTransactionDependencies,
): void {
  const { grid, planner } = dependencies
  if (
    grid.version !== previousVersion + 1 ||
    documentSignature(grid.toDocument()) !== documentSignature(expected) ||
    planner.result !== null ||
    planner.error !== null ||
    planner.executionTime !== null ||
    planner.resultVersion !== null ||
    planner.currentRequestId !== null ||
    planner.status !== 'idle' ||
    planner.traceEvents.length !== 0 ||
    planner.traceReceivedSteps !== 0 ||
    planner.currentEventIndex !== -1 ||
    planner.playbackStatus !== 'idle'
  ) {
    throw new MapImportTransactionFailure(
      'MAP_IMPORT_POSTCONDITION_FAILED',
      '地图导入后的状态校验失败。',
    )
  }
}

function createTiming(): MapImportTransactionMetrics['timing'] {
  return {
    validationMs: 0,
    snapshotMs: 0,
    bulkApplyMs: 0,
    postconditionMs: 0,
    totalMs: 0,
  }
}

function failureResult(
  code: string,
  message: string,
  warnings: string[] = [],
  metrics: MapImportTransactionMetrics | null = null,
): MapImportTransactionResult {
  return {
    status: 'failed',
    applied: false,
    metrics,
    error: { code, message },
    warnings,
  }
}

export function createMapImportTransactionDependencies(
  grid: GridStore,
  planner: PlannerStore,
): MapImportTransactionDependencies {
  return {
    grid,
    planner,
    hardCancelPlanner: (requestId) =>
      plannerWorkerClient.hardCancel(requestId),
    stopTracePlayback: () => playbackFrameController.stopAll(),
  }
}

export async function applyMapDocumentTransaction(
  candidate: unknown,
  options: MapImportTransactionOptions,
  dependencies: MapImportTransactionDependencies,
): Promise<MapImportTransactionResult> {
  if (transactionLocked) {
    return {
      status: 'busy',
      applied: false,
      metrics: null,
      error: {
        code: 'MAP_IMPORT_TRANSACTION_BUSY',
        message: '另一项地图导入事务正在执行，请稍后重试。',
      },
      warnings: [],
    }
  }

  transactionLocked = true
  const now = dependencies.now ?? (() => performance.now())
  const totalStartedAt = now()
  const timing = createTiming()
  let snapshot: MapImportSnapshot | null = null
  let metrics: MapImportTransactionMetrics | null = null
  let mapApplied = false
  let plannerInvalidated = false
  let plannerCancellationAttempted = false
  let plannerBlockedByTransaction = false

  try {
    if (options.signal?.aborted) {
      return {
        status: 'cancelled',
        applied: false,
        metrics: null,
        error: null,
        warnings: [],
      }
    }

    const validationStartedAt = now()
    const document = validateTransactionDocument(candidate)
    if (
      options.expectedCurrentMapVersion !== undefined &&
      options.expectedCurrentMapVersion !== dependencies.grid.version
    ) {
      throw new MapImportTransactionFailure(
        'MAP_IMPORT_STALE_PREVIEW',
        '当前地图已在识别期间发生变化，请重新确认导入。',
      )
    }
    const capability =
      dependencies.capability?.(document) ?? getMapImportCapability(document)
    if (!capability.allowed) {
      return failureResult(
        capability.error?.code ?? 'MAP_IMPORT_CAPABILITY_REJECTED',
        capability.error?.message ?? '当前地图编辑器无法安全应用该地图。',
        capability.warnings,
      )
    }
    timing.validationMs = now() - validationStartedAt

    const snapshotStartedAt = now()
    snapshot = captureMapImportSnapshot(dependencies.grid, dependencies.planner)
    timing.snapshotMs = now() - snapshotStartedAt
    metrics = {
      previousMapVersion: snapshot.grid.mapVersion,
      nextMapVersion: snapshot.grid.mapVersion,
      width: document.width,
      height: document.height,
      obstacleCount: document.obstacles.length,
      terrainCount: document.terrain.length,
      plannerWasRunning: snapshot.planner.status === 'running',
      traceWasActive:
        snapshot.planner.trace.events.length > 0 ||
        snapshot.planner.playback.status !== 'idle',
      timing,
    }

    dependencies.planner.setPlannerStartsBlocked(true)
    plannerBlockedByTransaction = true
    const requestId = dependencies.planner.currentRequestId
    plannerCancellationAttempted = true
    await dependencies.hardCancelPlanner(requestId)
    dependencies.planner.invalidateRequestsForImport()
    plannerInvalidated = true
    dependencies.stopTracePlayback()

    if (options.signal?.aborted) {
      dependencies.planner.restorePlannerImportState(snapshot.planner)
      return {
        status: 'cancelled',
        applied: false,
        metrics,
        error: null,
        warnings: requestId
          ? ['导入已取消；之前运行的路径规划任务不会恢复。']
          : [],
      }
    }

    const bulkApplyStartedAt = now()
    dependencies.grid.applyGridMapDocument(document, {
      incrementVersion: true,
      dirty: false,
    })
    mapApplied = true
    dependencies.planner.clearForImportedMap({
      preserveSelectedAlgorithm: options.preserveSelectedAlgorithm ?? true,
      preservePlaybackSpeed: options.preservePlaybackSpeed ?? true,
    })
    timing.bulkApplyMs = now() - bulkApplyStartedAt
    await dependencies.faultInjector?.('after-map-apply')

    const postconditionStartedAt = now()
    assertPostconditions(document, snapshot.grid.mapVersion, dependencies)
    timing.postconditionMs = now() - postconditionStartedAt
    metrics.nextMapVersion = dependencies.grid.version

    return {
      status: 'success',
      applied: true,
      metrics,
      error: null,
      warnings: capability.warnings,
    }
  } catch (error) {
    const failure =
      error instanceof MapImportTransactionFailure
        ? error
        : new MapImportTransactionFailure(
            'MAP_IMPORT_TRANSACTION_FAILED',
            error instanceof Error ? error.message : '地图导入事务执行失败。',
          )

    if (snapshot && mapApplied) {
      dependencies.grid.restoreGridMapSnapshot(snapshot.grid)
      dependencies.planner.restorePlannerImportState(snapshot.planner)
      if (metrics) metrics.nextMapVersion = snapshot.grid.mapVersion
      return failureResult(
        'MAP_IMPORT_TRANSACTION_ROLLED_BACK',
        `地图导入失败，已恢复原状态：${failure.message}`,
        ['地图状态已恢复，但之前运行的路径规划任务已取消。'],
        metrics,
      )
    }
    if (snapshot && (plannerInvalidated || plannerCancellationAttempted)) {
      dependencies.planner.restorePlannerImportState(snapshot.planner)
    }
    return failureResult(failure.code, failure.message, [], metrics)
  } finally {
    if (metrics) timing.totalMs = now() - totalStartedAt
    if (plannerBlockedByTransaction) {
      dependencies.planner.setPlannerStartsBlocked(false)
    }
    transactionLocked = false
  }
}
