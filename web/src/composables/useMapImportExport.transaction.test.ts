import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMPORT_FILE_SIZE_LIMITS } from '@/config/importLimits'
import {
  applyMapDocumentTransaction,
  type MapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type {
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import { useToast } from './useToast'
import {
  MapFileImportError,
  useMapImportExport,
} from './useMapImportExport'

const createDocument = (
  width = 10,
  height = width,
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

const createFile = (
  content: string,
  options: {
    name?: string
    type?: string
    size?: number
    text?: () => Promise<string>
  } = {},
): File => ({
  name: options.name ?? 'map.json',
  type: options.type ?? 'application/json',
  size: options.size ?? content.length,
  text: options.text ?? (async () => content),
} as File)

const plannerResult: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'bfs',
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

const traceBatch = (requestId: string): TraceBatchMessage => ({
  type: 'trace-batch',
  requestId,
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
  events: [{
    step: 0,
    kind: 'expanded',
    point: [0, 0],
    frontierSize: 0,
    source: null,
  }],
})

const preparePlanner = (
  grid: ReturnType<typeof useGridStore>,
  planner: ReturnType<typeof usePlannerStore>,
): void => {
  planner.selectedAlgorithm = 'bfs'
  planner.playbackSpeed = 4
  planner.begin('old-json-request', grid.version, 'bfs')
  planner.appendTraceBatch(
    traceBatch('old-json-request'),
    grid.version,
    'bfs',
  )
  planner.complete(
    'old-json-request',
    plannerResult,
    5,
    grid.version,
    'bfs',
  )
  planner.applyTraceIndex(0)
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

const successResult = (): MapImportTransactionResult => ({
  status: 'success',
  applied: true,
  metrics: null,
  error: null,
  warnings: [],
})

describe('useMapImportExport 原子 JSON 导入', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const toast = useToast()
    for (const message of [...toast.messages.value]) toast.remove(message.id)
  })

  it.each([
    {
      name: '拒绝非 JSON 扩展名和 MIME',
      file: createFile('{}', { name: 'map.txt', type: 'text/plain' }),
      code: 'MAP_FILE_TYPE_UNSUPPORTED',
    },
    {
      name: '拒绝超过 1 MiB 的 JSON',
      file: createFile('{}', {
        size: IMPORT_FILE_SIZE_LIMITS.json + 1,
      }),
      code: 'MAP_FILE_TOO_LARGE',
    },
    {
      name: '拒绝无效 JSON',
      file: createFile('{ invalid'),
      code: 'MAP_FILE_JSON_INVALID',
    },
    {
      name: '拒绝非法 GridMapDocument',
      file: createFile(JSON.stringify({
        format: 'moon-pathplanning.grid.v1',
        width: 10,
      })),
      code: 'MAP_IMPORT_INVALID_DOCUMENT',
    },
  ])('$name，且不触碰地图和 Planner', async ({ file, code }) => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlanner(grid, planner)
    const beforeVersion = grid.version
    const beforeResult = planner.result
    const beforeTrace = [...planner.traceEvents]
    const transaction = vi.fn<typeof applyMapDocumentTransaction>()
    const importer = useMapImportExport({ transaction })

    await expect(importer.importFile(file)).rejects.toMatchObject({ code })

    expect(transaction).not.toHaveBeenCalled()
    expect(grid.version).toBe(beforeVersion)
    expect(planner.result).toBe(beforeResult)
    expect(planner.traceEvents).toEqual(beforeTrace)
    expect(planner.playbackStatus).toBe('playing')
    expect(importer.importError.value?.code).toBe(code)
  })

  it('通过真实 Pinia 事务完整替换地图并隔离旧 Planner 结果', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlanner(grid, planner)
    const previousVersion = grid.version
    const transaction = vi.fn(applyMapDocumentTransaction)
    const importer = useMapImportExport({
      transaction,
      createDependencies,
    })

    await importer.importFile(
      createFile(JSON.stringify(createDocument(21, 17))),
    )

    expect(transaction).toHaveBeenCalledOnce()
    expect(transaction.mock.calls[0]?.[1]).toEqual({
      source: 'json',
      expectedCurrentMapVersion: previousVersion,
      preserveSelectedAlgorithm: true,
      preservePlaybackSpeed: true,
    })
    expect(grid.width).toBe(21)
    expect(grid.height).toBe(17)
    expect(grid.version).toBe(previousVersion + 1)
    expect(planner.result).toBeNull()
    expect(planner.traceEvents).toEqual([])
    expect(planner.playbackStatus).toBe('idle')
    expect(planner.status).toBe('idle')
    expect(planner.selectedAlgorithm).toBe('bfs')
    expect(planner.playbackSpeed).toBe(4)
    expect(
      planner.appendTraceBatch(
        traceBatch('old-json-request'),
        previousVersion,
        'bfs',
      ),
    ).toBe(false)
    expect(
      planner.complete(
        'old-json-request',
        plannerResult,
        8,
        previousVersion,
        'bfs',
      ),
    ).toBe(false)
    expect(grid.version).toBe(previousVersion + 1)
    expect(importer.importStatus.value).toBe('success')
    expect(
      useToast().messages.value.filter(
        (message) => message.text === '已导入 map.json',
      ),
    ).toHaveLength(1)
  })

  it('以选择文件时的 mapVersion 检测读取期间的并发修改', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    preparePlanner(grid, planner)
    const versionAtSelection = grid.version
    let finishReading!: (text: string) => void
    const text = new Promise<string>((resolve) => {
      finishReading = resolve
    })
    const importer = useMapImportExport({ createDependencies })
    const pending = importer.importFile(createFile('', {
      size: 100,
      text: () => text,
    }))

    expect(importer.importStatus.value).toBe('reading')
    grid.setObstacle({ x: 4, y: 4 })
    const changedVersion = grid.version
    const existingResult = planner.result
    const existingTrace = [...planner.traceEvents]
    finishReading(JSON.stringify(createDocument()))

    await expect(pending).rejects.toMatchObject({
      code: 'MAP_IMPORT_STALE_PREVIEW',
    })
    expect(versionAtSelection).toBe(changedVersion - 1)
    expect(grid.version).toBe(changedVersion)
    expect(grid.obstacles).toContain('4,4')
    expect(planner.result).toBe(existingResult)
    expect(planner.traceEvents).toEqual(existingTrace)
    expect(importer.importStatus.value).toBe('stale')
    expect(
      useToast().messages.value.some(
        (message) => message.text.startsWith('已导入 '),
      ),
    ).toBe(false)
  })

  it('允许 60×60，并分别拒绝 61×60 和 60×61', async () => {
    const importer = useMapImportExport({ createDependencies })
    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument(60, 60))),
      ),
    ).resolves.toBeUndefined()
    const grid = useGridStore()
    const versionAfterSuccess = grid.version

    for (const document of [
      createDocument(61, 60),
      createDocument(60, 61),
    ]) {
      await expect(
        importer.importFile(createFile(JSON.stringify(document)),
      )).rejects.toMatchObject({
        code: 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED',
      })
      expect(grid.width).toBe(60)
      expect(grid.height).toBe(60)
      expect(grid.version).toBe(versionAfterSuccess)
    }
    expect(importer.importStatus.value).toBe('size-blocked')
  })

  it('reading 期间拒绝第二个文件，完成后允许再次导入', async () => {
    let finishReading!: (text: string) => void
    const delayedText = new Promise<string>((resolve) => {
      finishReading = resolve
    })
    const importer = useMapImportExport({ createDependencies })
    const first = importer.importFile(createFile('', {
      size: 100,
      text: () => delayedText,
    }))

    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument(12))),
      ),
    ).rejects.toMatchObject({
      code: 'MAP_IMPORT_TRANSACTION_BUSY',
    })
    finishReading(JSON.stringify(createDocument(11)))
    await first
    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument(12))),
      ),
    ).resolves.toBeUndefined()
    expect(useGridStore().width).toBe(12)
  })

  it('applying 期间重复提交只产生一个事务', async () => {
    let finishTransaction!: (result: MapImportTransactionResult) => void
    const transactionResult = new Promise<MapImportTransactionResult>(
      (resolve) => {
        finishTransaction = resolve
      },
    )
    const transaction = vi.fn<typeof applyMapDocumentTransaction>()
      .mockReturnValue(transactionResult)
    const importer = useMapImportExport({ transaction })
    const first = importer.importFile(
      createFile(JSON.stringify(createDocument())),
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(importer.importStatus.value).toBe('applying')
    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument(12))),
      ),
    ).rejects.toMatchObject({
      code: 'MAP_IMPORT_TRANSACTION_BUSY',
    })
    expect(transaction).toHaveBeenCalledOnce()

    finishTransaction(successResult())
    await first
    expect(importer.importStatus.value).toBe('success')
  })

  it.each([
    {
      result: {
        status: 'busy',
        applied: false,
        metrics: null,
        error: {
          code: 'MAP_IMPORT_TRANSACTION_BUSY',
          message: 'busy',
        },
        warnings: [],
      } satisfies MapImportTransactionResult,
      status: 'busy',
      code: 'MAP_IMPORT_TRANSACTION_BUSY',
    },
    {
      result: {
        status: 'failed',
        applied: false,
        metrics: null,
        error: {
          code: 'MAP_IMPORT_TRANSACTION_ROLLED_BACK',
          message: 'rolled back',
        },
        warnings: [],
      } satisfies MapImportTransactionResult,
      status: 'failed',
      code: 'MAP_IMPORT_TRANSACTION_ROLLED_BACK',
    },
  ])('保留事务错误 $code 且不显示成功 Toast', async ({
    result,
    status,
    code,
  }) => {
    const transaction = vi.fn<typeof applyMapDocumentTransaction>()
      .mockResolvedValue(result)
    const importer = useMapImportExport({ transaction })

    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument())),
      ),
    ).rejects.toMatchObject({ code })

    expect(importer.importStatus.value).toBe(status)
    expect(importer.importError.value?.code).toBe(code)
    expect(
      useToast().messages.value.some(
        (message) => message.text.startsWith('已导入 '),
      ),
    ).toBe(false)
  })

  it('文件读取失败返回结构化错误', async () => {
    const importer = useMapImportExport()
    const failure = new Error('disk failure')

    await expect(
      importer.importFile(createFile('', {
        size: 100,
        text: async () => {
          throw failure
        },
      })),
    ).rejects.toEqual(
      new MapFileImportError(
        'MAP_FILE_READ_FAILED',
        '读取 JSON 地图文件失败，请重新选择文件。',
      ),
    )
  })

  it('事务 success 但未 applied 时不视为导入成功', async () => {
    const transaction = vi.fn<typeof applyMapDocumentTransaction>()
      .mockResolvedValue({
        ...successResult(),
        applied: false,
      })
    const importer = useMapImportExport({ transaction })

    await expect(
      importer.importFile(
        createFile(JSON.stringify(createDocument())),
      ),
    ).rejects.toMatchObject({
      code: 'MAP_IMPORT_TRANSACTION_FAILED',
    })
    expect(importer.importStatus.value).toBe('failed')
  })
})
