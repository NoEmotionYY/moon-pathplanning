import { createPinia, setActivePinia } from 'pinia'
import { usePlayback } from '@/composables/usePlayback'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type { MapImportTransactionOptions } from '@/types/mapImportTransaction'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import {
  applyMapDocumentTransaction,
  createMapImportTransactionDependencies,
  type MapImportGridPort,
  type MapImportPlannerPort,
  type MapImportTransactionDependencies,
} from './applyMapDocumentTransaction'

const options: MapImportTransactionOptions = {
  source: 'maze-image',
}

const createDocument = (
  width = 12,
  height = 10,
): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width,
  height,
  start: [0, 0],
  goal: [width - 1, height - 1],
  movement: 'four_way',
  obstacles: [[2, 2], [3, 2]],
  terrain: [{ point: [1, 1], cost: 2 }],
})

const plannerResult: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'bfs',
  movement: 'four_way',
  path: [[1, 1], [2, 1]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  trace: { supported: true, mode: 'recorded', totalSteps: 1, events: [] },
  error: null,
}

const traceBatch: TraceBatchMessage = {
  type: 'trace-batch',
  requestId: 'old-request',
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
  events: [
    {
      step: 0,
      kind: 'expanded',
      point: [1, 1],
      frontierSize: 0,
      source: null,
    },
  ],
}

function preparePlannerResult(
  grid: ReturnType<typeof useGridStore>,
  planner: ReturnType<typeof usePlannerStore>,
): void {
  planner.selectedAlgorithm = 'bfs'
  planner.playbackSpeed = 4
  planner.begin('old-request', grid.version, 'bfs')
  planner.appendTraceBatch(traceBatch, grid.version, 'bfs')
  planner.complete(
    'old-request',
    plannerResult,
    8,
    grid.version,
    'bfs',
  )
  planner.applyTraceIndex(0)
  planner.playbackStatus = 'playing'
}

function dependencies(
  grid: ReturnType<typeof useGridStore>,
  planner: ReturnType<typeof usePlannerStore>,
): MapImportTransactionDependencies {
  return {
    ...createMapImportTransactionDependencies(grid, planner),
    hardCancelPlanner: vi.fn(),
    stopTracePlayback: vi.fn(() => false),
  }
}

function fakeDependencies(): MapImportTransactionDependencies {
  let currentDocument = createDocument(10, 10)
  const grid: MapImportGridPort = {
    version: 12,
    dirty: true,
    toDocument: () => currentDocument,
    applyGridMapDocument(document) {
      currentDocument = document
      this.version += 1
      this.dirty = false
    },
    restoreGridMapSnapshot(snapshot) {
      currentDocument = snapshot.document
      this.version = snapshot.mapVersion
      this.dirty = snapshot.dirty
    },
  }
  const planner: MapImportPlannerPort = {
    selectedAlgorithm: 'astar',
    status: 'idle',
    result: null,
    error: null,
    executionTime: null,
    resultVersion: null,
    currentRequestId: null,
    requestGeneration: 0,
    traceSupported: false,
    traceMode: 'none',
    traceEvents: [],
    traceTotalSteps: 0,
    traceReceivedSteps: 0,
    traceRequestId: null,
    traceMapVersion: null,
    traceAlgorithm: null,
    playbackStatus: 'idle',
    playbackSpeed: 1,
    currentEventIndex: -1,
    visitedCells: new Set(),
    expandedCells: new Set(),
    frontierCells: new Set(),
    currentCell: null,
    plannerStartsBlocked: false,
    setPlannerStartsBlocked(blocked) {
      this.plannerStartsBlocked = blocked
    },
    invalidateRequestsForImport() {
      const requestId = this.currentRequestId
      this.currentRequestId = null
      this.requestGeneration += 1
      return requestId
    },
    clearForImportedMap() {
      this.status = 'idle'
      this.result = null
      this.error = null
      this.executionTime = null
      this.resultVersion = null
      this.currentRequestId = null
      this.traceEvents = []
      this.traceReceivedSteps = 0
      this.currentEventIndex = -1
      this.playbackStatus = 'idle'
    },
    restorePlannerImportState(snapshot) {
      this.selectedAlgorithm = snapshot.selectedAlgorithm
      this.status = 'idle'
      this.result = snapshot.result
      this.error = snapshot.error
      this.executionTime = snapshot.executionTime
      this.resultVersion = snapshot.resultVersion
      this.currentRequestId = null
      this.requestGeneration = snapshot.requestGeneration + 1
      this.traceSupported = snapshot.trace.supported
      this.traceMode = snapshot.trace.mode
      this.traceEvents = snapshot.trace.events
      this.traceTotalSteps = snapshot.trace.totalSteps
      this.traceReceivedSteps = snapshot.trace.receivedSteps
      this.traceRequestId = snapshot.trace.requestId
      this.traceMapVersion = snapshot.trace.mapVersion
      this.traceAlgorithm = snapshot.trace.algorithm
      this.playbackStatus = snapshot.playback.status
      this.playbackSpeed = snapshot.playback.speed
      this.currentEventIndex = snapshot.playback.currentEventIndex
      this.visitedCells = snapshot.playback.visitedCells
      this.expandedCells = snapshot.playback.expandedCells
      this.frontierCells = snapshot.playback.frontierCells
      this.currentCell = snapshot.playback.currentCell
    },
  }
  return {
    grid,
    planner,
    hardCancelPlanner: vi.fn(),
    stopTracePlayback: vi.fn(() => false),
  }
}

describe('applyMapDocumentTransaction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 71))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('可通过最小 Fake Store 依赖运行且不启动真实 Worker', async () => {
    const deps = fakeDependencies()

    const result = await applyMapDocumentTransaction(
      createDocument(),
      options,
      deps,
    )

    expect(result.status).toBe('success')
    expect(deps.grid.version).toBe(13)
    expect(deps.grid.toDocument()).toEqual(createDocument())
    expect(deps.hardCancelPlanner).toHaveBeenCalledWith(null)
  })

  it('通过真实 Pinia Store 一次提交地图并彻底清空旧结果', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlannerResult(grid, planner)
    planner.error = { code: 'OLD_ERROR', message: '旧错误' }
    const previousVersion = grid.version
    const bulkApply = vi.spyOn(grid, 'applyGridMapDocument')

    const result = await applyMapDocumentTransaction(
      createDocument(),
      { ...options, expectedCurrentMapVersion: previousVersion },
      dependencies(grid, planner),
    )

    expect(result.status).toBe('success')
    expect(result.applied).toBe(true)
    expect(grid.toDocument()).toEqual(createDocument())
    expect(grid.version).toBe(previousVersion + 1)
    expect(planner.result).toBeNull()
    expect(planner.error).toBeNull()
    expect(planner.traceEvents).toEqual([])
    expect(planner.currentEventIndex).toBe(-1)
    expect(planner.playbackStatus).toBe('idle')
    expect(planner.selectedAlgorithm).toBe('bfs')
    expect(planner.playbackSpeed).toBe(4)
    expect(planner.plannerStartsBlocked).toBe(false)
    expect(bulkApply).toHaveBeenCalledTimes(1)
  })

  it('可按选项重置算法和播放倍速，默认则保留', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    planner.selectedAlgorithm = 'dfs'
    planner.playbackSpeed = 8

    const result = await applyMapDocumentTransaction(
      createDocument(),
      {
        source: 'maze-image',
        preserveSelectedAlgorithm: false,
        preservePlaybackSpeed: false,
      },
      dependencies(grid, planner),
    )

    expect(result.status).toBe('success')
    expect(planner.selectedAlgorithm).toBe('astar')
    expect(planner.playbackSpeed).toBe(1)
  })

  it.each([
    ['非法 format', { ...createDocument(), format: 'invalid' }],
    ['start 越界', { ...createDocument(), start: [12, 0] }],
    ['goal 越界', { ...createDocument(), goal: [0, 10] }],
    [
      'start 位于障碍',
      { ...createDocument(), obstacles: [[0, 0], [2, 2]] },
    ],
    [
      '重复障碍',
      { ...createDocument(), obstacles: [[2, 2], [2, 2]] },
    ],
    [
      '重复 terrain',
      {
        ...createDocument(),
        terrain: [
          { point: [1, 1], cost: 2 },
          { point: [1, 1], cost: 4 },
        ],
      },
    ],
    [
      '非有限 terrain 代价',
      {
        ...createDocument(),
        terrain: [{ point: [1, 1], cost: Number.POSITIVE_INFINITY }],
      },
    ],
    [
      'terrain 与障碍重叠',
      {
        ...createDocument(),
        terrain: [{ point: [2, 2], cost: 2 }],
      },
    ],
    ['非法 movement', { ...createDocument(), movement: 'six_way' }],
  ])('%s 时不修改地图、不清空路径也不取消 Worker', async (_name, invalid) => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlannerResult(grid, planner)
    const before = grid.toDocument()
    const beforeVersion = grid.version
    const deps = dependencies(grid, planner)

    const result = await applyMapDocumentTransaction(invalid, options, deps)

    expect(result.status).toBe('failed')
    expect(grid.toDocument()).toEqual(before)
    expect(grid.version).toBe(beforeVersion)
    expect(planner.result?.path).toEqual(plannerResult.path)
    expect(planner.traceEvents).toHaveLength(1)
    expect(deps.hardCancelPlanner).not.toHaveBeenCalled()
  })

  it('拒绝过期预览和超过 60×60 的正式应用', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlannerResult(grid, planner)
    const deps = dependencies(grid, planner)
    const versionBefore = grid.version

    const stale = await applyMapDocumentTransaction(
      createDocument(),
      { ...options, expectedCurrentMapVersion: versionBefore + 1 },
      deps,
    )
    const oversized = await applyMapDocumentTransaction(
      createDocument(61, 20),
      options,
      deps,
    )

    expect(stale.error?.code).toBe('MAP_IMPORT_STALE_PREVIEW')
    expect(oversized.error?.code).toBe('MAP_IMPORT_RENDER_LIMIT_EXCEEDED')
    expect(grid.version).toBe(versionBefore)
    expect(planner.result?.path).toEqual(plannerResult.path)
    expect(planner.traceEvents).toHaveLength(1)
    expect(deps.hardCancelPlanner).not.toHaveBeenCalled()
  })

  it('地图写入后的异常会恢复地图版本、路径、Trace 和回放快照', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    grid.setObstacle({ x: 5, y: 5 })
    preparePlannerResult(grid, planner)
    const previousDocument = grid.toDocument()
    const previousVersion = grid.version
    const deps = dependencies(grid, planner)
    deps.faultInjector = () => {
      throw new Error('测试注入故障')
    }

    const result = await applyMapDocumentTransaction(
      createDocument(),
      options,
      deps,
    )

    expect(result.error?.code).toBe('MAP_IMPORT_TRANSACTION_ROLLED_BACK')
    expect(result.warnings).toContain(
      '地图状态已恢复，但之前运行的路径规划任务已取消。',
    )
    expect(grid.toDocument()).toEqual(previousDocument)
    expect(grid.version).toBe(previousVersion)
    expect(planner.result?.path).toEqual(plannerResult.path)
    expect(planner.traceEvents).toHaveLength(1)
    expect(planner.currentEventIndex).toBe(0)
    expect(planner.playbackStatus).toBe('paused')
    expect(planner.status).toBe('idle')
    expect(planner.currentRequestId).toBeNull()

    deps.faultInjector = undefined
    const next = await applyMapDocumentTransaction(
      createDocument(10, 10),
      options,
      deps,
    )
    expect(next.status).toBe('success')
  })

  it('并发导入期间返回 MAP_IMPORT_TRANSACTION_BUSY', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    planner.begin('old-request', grid.version, 'astar')
    let releaseCancellation!: () => void
    const cancellationGate = new Promise<void>((resolve) => {
      releaseCancellation = resolve
    })
    const deps = dependencies(grid, planner)
    deps.hardCancelPlanner = vi.fn(() => cancellationGate)

    const first = applyMapDocumentTransaction(createDocument(), options, deps)
    await Promise.resolve()
    const second = await applyMapDocumentTransaction(
      createDocument(10, 10),
      options,
      deps,
    )
    releaseCancellation()
    const firstResult = await first

    expect(second.status).toBe('busy')
    expect(second.error?.code).toBe('MAP_IMPORT_TRANSACTION_BUSY')
    expect(firstResult.status).toBe('success')
    expect(deps.hardCancelPlanner).toHaveBeenCalledWith('old-request')
    expect(planner.requestGeneration).toBe(1)
    expect(planner.status).toBe('idle')
  })

  it('停止所有已注册的 requestAnimationFrame 回放', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlannerResult(grid, planner)
    const playback = usePlayback()
    playback.play()
    const deps = createMapImportTransactionDependencies(grid, planner)
    deps.hardCancelPlanner = vi.fn()

    await applyMapDocumentTransaction(createDocument(), options, deps)

    expect(cancelAnimationFrame).toHaveBeenCalledWith(71)
    playback.dispose()
  })

  it.each([{ size: 59 }, { size: 60 }])(
    '记录 $size×$size 事务各阶段耗时，不设置环境相关阈值',
    async ({ size }) => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    const document = createDocument(size, size)

    const result = await applyMapDocumentTransaction(
      document,
      options,
      dependencies(grid, planner),
    )

    console.info(
      `[applyMapDocumentTransaction] ${size}×${size}: ${result.metrics?.timing.totalMs.toFixed(3)} ms`,
    )
    expect(result.status).toBe('success')
    expect(result.metrics?.width).toBe(size)
    expect(Number.isFinite(result.metrics?.timing.totalMs)).toBe(true)
    },
  )
})
