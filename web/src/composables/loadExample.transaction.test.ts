import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyMapDocumentTransaction,
  type MapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import { useToast } from './useToast'
import {
  useMapImportExport,
  type ExampleName,
} from './useMapImportExport'

const exampleDocument = (): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width: 14,
  height: 12,
  start: [0, 0],
  goal: [13, 11],
  movement: 'eight_way',
  obstacles: [[2, 2], [3, 2]],
  terrain: [{ point: [1, 1], cost: 4 }],
})

const plannerResult: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'dijkstra',
  movement: 'four_way',
  path: [[0, 0], [1, 0]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  error: null,
}

const traceBatch: TraceBatchMessage = {
  type: 'trace-batch',
  requestId: 'example-old',
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
  events: [{
    step: 0,
    kind: 'discovered',
    point: [0, 0],
    frontierSize: 1,
    source: null,
  }],
}

const preparePlanner = (
  grid: ReturnType<typeof useGridStore>,
  planner: ReturnType<typeof usePlannerStore>,
): void => {
  planner.selectedAlgorithm = 'dijkstra'
  planner.playbackSpeed = 8
  planner.begin('example-old', grid.version, 'dijkstra')
  planner.appendTraceBatch(
    traceBatch,
    grid.version,
    'dijkstra',
  )
  planner.complete(
    'example-old',
    plannerResult,
    4,
    grid.version,
    'dijkstra',
  )
  planner.playbackStatus = 'playing'
}

const createDependencies = (
  grid: ReturnType<typeof useGridStore>,
  planner: ReturnType<typeof usePlannerStore>,
): MapImportTransactionDependencies => ({
  grid,
  planner,
  hardCancelPlanner: vi.fn(),
  stopTracePlayback: vi.fn(() => false),
})

const responseFor = (
  text: () => Promise<string>,
  ok = true,
): Response => ({
  ok,
  text,
} as Response)

describe('loadExample 原子示例地图加载', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const toast = useToast()
    for (const message of [...toast.messages.value]) toast.remove(message.id)
  })

  it('通过 JSON 原子事务加载示例并保留用户规划偏好', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlanner(grid, planner)
    const previousVersion = grid.version
    const fetcher = vi.fn(async () =>
      responseFor(async () => JSON.stringify(exampleDocument())))
    const transaction = vi.fn(applyMapDocumentTransaction)
    const importer = useMapImportExport({
      fetcher,
      transaction,
      createDependencies,
    })

    await importer.loadExample('simple_grid')

    expect(fetcher).toHaveBeenCalledWith(
      '/moon-pathplanning/examples/simple_grid.json',
    )
    expect(transaction).toHaveBeenCalledOnce()
    expect(transaction.mock.calls[0]?.[1]).toEqual({
      source: 'json',
      expectedCurrentMapVersion: previousVersion,
      preserveSelectedAlgorithm: true,
      preservePlaybackSpeed: true,
    })
    expect(grid.toDocument()).toEqual(exampleDocument())
    expect(grid.version).toBe(previousVersion + 1)
    expect(planner.result).toBeNull()
    expect(planner.traceEvents).toEqual([])
    expect(planner.playbackStatus).toBe('idle')
    expect(planner.status).toBe('idle')
    expect(planner.selectedAlgorithm).toBe('dijkstra')
    expect(planner.playbackSpeed).toBe(8)
    expect(
      useToast().messages.value.filter(
        (message) => message.text === '示例地图已加载',
      ),
    ).toHaveLength(1)
  })

  it('fetch 失败不修改地图、Planner 或版本', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlanner(grid, planner)
    const beforeDocument = grid.toDocument()
    const beforeVersion = grid.version
    const beforeResult = planner.result
    const beforeTrace = [...planner.traceEvents]
    const importer = useMapImportExport({
      fetcher: vi.fn(async () => responseFor(async () => '', false)),
    })

    await expect(
      importer.loadExample('simple_grid'),
    ).rejects.toMatchObject({
      code: 'MAP_EXAMPLE_FETCH_FAILED',
    })

    expect(grid.toDocument()).toEqual(beforeDocument)
    expect(grid.version).toBe(beforeVersion)
    expect(planner.result).toBe(beforeResult)
    expect(planner.traceEvents).toEqual(beforeTrace)
    expect(planner.playbackStatus).toBe('playing')
    expect(
      useToast().messages.value.some(
        (message) => message.text === '示例地图已加载',
      ),
    ).toBe(false)
  })

  it('拒绝未知示例名且不发起 fetch', async () => {
    const fetcher = vi.fn()
    const importer = useMapImportExport({ fetcher })

    await expect(
      importer.loadExample('not-found' as ExampleName),
    ).rejects.toMatchObject({
      code: 'MAP_EXAMPLE_UNKNOWN',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('示例读取期间地图变化时拒绝覆盖新修改', async () => {
    const grid = useGridStore()
    let finishReading!: (text: string) => void
    const delayedText = new Promise<string>((resolve) => {
      finishReading = resolve
    })
    const fetcher = vi.fn(async () =>
      responseFor(() => delayedText))
    const importer = useMapImportExport({
      fetcher,
      createDependencies,
    })
    const pending = importer.loadExample('simple_grid')
    const versionAtStart = grid.version

    grid.setObstacle({ x: 5, y: 5 })
    const changedVersion = grid.version
    finishReading(JSON.stringify(exampleDocument()))

    await expect(pending).rejects.toMatchObject({
      code: 'MAP_IMPORT_STALE_PREVIEW',
    })
    expect(changedVersion).toBe(versionAtStart + 1)
    expect(grid.version).toBe(changedVersion)
    expect(grid.obstacles).toContain('5,5')
    expect(importer.importStatus.value).toBe('stale')
  })

  it('示例读取期间拒绝重复加载，结束后恢复', async () => {
    let finishReading!: (text: string) => void
    const delayedText = new Promise<string>((resolve) => {
      finishReading = resolve
    })
    const fetcher = vi.fn()
      .mockResolvedValueOnce(responseFor(() => delayedText))
      .mockResolvedValue(
        responseFor(async () => JSON.stringify(exampleDocument())),
      )
    const importer = useMapImportExport({
      fetcher,
      createDependencies,
    })
    const first = importer.loadExample('simple_grid')

    await expect(
      importer.loadExample('weighted_grid'),
    ).rejects.toMatchObject({
      code: 'MAP_IMPORT_TRANSACTION_BUSY',
    })
    finishReading(JSON.stringify(exampleDocument()))
    await first
    await expect(
      importer.loadExample('weighted_grid'),
    ).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
