import { createPinia, setActivePinia } from 'pinia'
import { ref, shallowRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkerResultFixture,
  createWorkerResultWithEntrances,
} from '@/services/import/testUtils/mazeImportWorkerFixtures'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type {
  DecodedImage,
  ImageTransformState,
  MazeSourceFileType,
} from '@/types/import'
import type { GridMapDocument } from '@/types/grid'
import type {
  MapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import type {
  MapImportTransactionOptions,
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import type {
  PlannerResult,
  TraceBatchMessage,
} from '@/types/planner'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import { useMazeMapApplication } from './useMazeMapApplication'
import type {
  UseMazeImportAnalysis,
} from './useMazeImportAnalysis'
import {
  useMazeImportWizard,
  type RasterImageImport,
} from './useMazeImportWizard'

const document = (width: number, height = width): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width,
  height,
  start: [1, 0],
  goal: [width - 2, height - 1],
  movement: 'four_way',
  obstacles: [[0, 0], [2, 0]],
  terrain: [],
})

const successResult = (
  width: number,
  height = width,
): MazeImportWorkerResult => ({
  ...createWorkerResultWithEntrances('success', 'selected'),
  document: document(width, height),
  diagnostics: {
    ...createWorkerResultFixture('success').diagnostics,
    convertedWidth: width,
    convertedHeight: height,
  },
})

const decoded: DecodedImage = {
  matrix: {
    width: 8,
    height: 10,
    rgba: new Uint8ClampedArray(8 * 10 * 4),
  },
  metadata: {
    width: 8,
    height: 10,
    pixels: 80,
    mimeType: 'image/png',
    fileSize: 4,
    fileName: 'maze.png',
  },
}

const createRaster = (): RasterImageImport => {
  const selectedFile = shallowRef<File | null>(
    new File(['maze'], 'maze.png', { type: 'image/png' }),
  )
  const decodedImage = shallowRef<DecodedImage | null>(decoded)
  const transformedImage = shallowRef<DecodedImage['matrix'] | null>(
    decoded.matrix,
  )
  const fileType = ref<MazeSourceFileType>('png')
  const transformState = ref<ImageTransformState>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    invert: false,
  })
  const reset = vi.fn(() => {
    selectedFile.value = null
    decodedImage.value = null
    transformedImage.value = null
    fileType.value = 'unsupported'
  })
  return {
    selectedFile,
    decodedImage,
    transformedImage,
    fileType,
    transformState,
    error: ref(null),
    isLoading: ref(false),
    selectFile: vi.fn(async () => true),
    cancelDecode: vi.fn(),
    rotateLeft: vi.fn(),
    rotateRight: vi.fn(),
    toggleHorizontal: vi.fn(),
    toggleVertical: vi.fn(),
    toggleInvert: vi.fn(),
    resetTransform: vi.fn(),
    reset,
  }
}

const createAnalysis = (
  outcomes: MazeImportWorkerResult[],
): UseMazeImportAnalysis => {
  const status = ref<UseMazeImportAnalysis['status']['value']>('idle')
  const result = shallowRef<MazeImportWorkerResult | null>(null)
  const error = ref(null)
  return {
    status,
    progress: ref(null),
    result,
    error,
    analyze: vi.fn(async () => {
      const outcome = outcomes.shift() ?? null
      if (!outcome) return null
      status.value = outcome.status
      result.value = outcome
      return outcome
    }),
    cancel: vi.fn(() => {
      status.value = 'cancelled'
    }),
    reset: vi.fn(() => {
      status.value = 'idle'
    }),
    dispose: vi.fn(() => {
      status.value = 'idle'
    }),
  }
}

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
  error: null,
}

const traceBatch = (requestId: string): TraceBatchMessage => ({
  type: 'trace-batch',
  requestId,
  events: [
    {
      step: 0,
      kind: 'expanded',
      point: [1, 1],
      frontierSize: 0,
      source: null,
    },
  ],
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
})

describe('useMazeImportWizard 图片地图应用', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('分析时绑定 grid.version，主地图变化后保留预览但禁用确认', async () => {
    const grid = useGridStore()
    const transaction = vi.fn()
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () =>
        createAnalysis([successResult(41), successResult(41)]),
      applicationFactory: (currentDocument) =>
        useMazeMapApplication(currentDocument, { transaction }),
    })

    await wizard.startAnalysis()
    expect(wizard.analysisBaseMapVersion.value).toBe(0)
    expect(wizard.canConfirmImport.value).toBe(true)

    grid.setObstacle({ x: 4, y: 4 })
    expect(wizard.isMapPreviewStale.value).toBe(true)
    expect(wizard.canConfirmImport.value).toBe(false)
    expect(wizard.result.value?.document?.width).toBe(41)
    expect(wizard.importApplicationError.value?.code).toBe(
      'MAP_IMPORT_STALE_PREVIEW',
    )
    wizard.openImportConfirmation()
    expect(await wizard.confirmMapImport()).toBeNull()
    expect(transaction).not.toHaveBeenCalled()

    await wizard.startAnalysis()
    expect(wizard.analysisBaseMapVersion.value).toBe(grid.version)
    expect(wizard.isMapPreviewStale.value).toBe(false)
  })

  it('二次确认后原样传递 Worker document 和分析时版本', async () => {
    const workerResult = successResult(21, 17)
    const transaction = vi.fn(async (
      _candidate: unknown,
      _options: MapImportTransactionOptions,
      _dependencies: MapImportTransactionDependencies,
    ): Promise<MapImportTransactionResult> => ({
      status: 'success' as const,
      applied: true,
      metrics: null,
      error: null,
      warnings: [],
    }))
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => createAnalysis([workerResult]),
      applicationFactory: (currentDocument) =>
        useMazeMapApplication(currentDocument, { transaction }),
    })
    await wizard.startAnalysis()
    const expectedVersion = wizard.analysisBaseMapVersion.value

    wizard.openImportConfirmation()
    await wizard.confirmMapImport()

    expect(transaction.mock.calls[0]?.[0]).toBe(workerResult.document)
    expect(transaction.mock.calls[0]?.[1]).toMatchObject({
      source: 'maze-image',
      expectedCurrentMapVersion: expectedVersion,
      preserveSelectedAlgorithm: true,
      preservePlaybackSpeed: true,
    })
  })

  it('手动入口 Pair 复算沿用首次分析版本，不掩盖主地图修改', async () => {
    const grid = useGridStore()
    const manual = createWorkerResultWithEntrances(
      'manual-input-required',
      'ambiguous',
    )
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () =>
        createAnalysis([manual, successResult(21, 17)]),
    })
    await wizard.startAnalysis()
    const originalBaseVersion = wizard.analysisBaseMapVersion.value
    grid.setObstacle({ x: 4, y: 4 })

    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    await wizard.applyManualEntranceSelection()

    expect(wizard.analysisStatus.value).toBe('success')
    expect(wizard.analysisBaseMapVersion.value).toBe(originalBaseVersion)
    expect(wizard.isMapPreviewStale.value).toBe(true)
    expect(wizard.canConfirmImport.value).toBe(false)
  })

  it.each([
    { size: 59, allowed: true },
    { size: 61, allowed: false },
    { size: 151, allowed: false },
  ])('$size×$size 结果的正式能力符合预期', async ({ size, allowed }) => {
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => createAnalysis([successResult(size)]),
    })
    await wizard.startAnalysis()

    expect(wizard.canShowImportAction.value).toBe(true)
    expect(wizard.importCapability.value?.allowed).toBe(allowed)
    expect(wizard.canConfirmImport.value).toBe(allowed)
    expect(wizard.result.value?.document?.width).toBe(size)
  })

  it('真实 Pinia 事务完整写入 21×17 并隔离旧 Planner 消息', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    const legacyLoad = vi.spyOn(grid, 'loadDocument')
    const legacyPlannerClear = vi.spyOn(planner, 'clearResult')
    planner.selectedAlgorithm = 'bfs'
    planner.playbackSpeed = 4
    const oldVersion = grid.version
    planner.begin('old-request', oldVersion, 'bfs')
    planner.appendTraceBatch(traceBatch('old-request'), oldVersion, 'bfs')
    planner.complete(
      'old-request',
      plannerResult,
      5,
      oldVersion,
      'bfs',
    )
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => createAnalysis([successResult(21, 17)]),
      applicationFactory: (currentDocument) =>
        useMazeMapApplication(currentDocument),
    })

    await wizard.startAnalysis()
    wizard.openImportConfirmation()
    const transaction = await wizard.confirmMapImport()

    expect(transaction?.status).toBe('success')
    expect(grid.width).toBe(21)
    expect(grid.height).toBe(17)
    expect(grid.version).toBe(oldVersion + 1)
    expect(planner.result).toBeNull()
    expect(planner.traceEvents).toEqual([])
    expect(planner.playbackStatus).toBe('idle')
    expect(planner.status).toBe('idle')
    expect(planner.selectedAlgorithm).toBe('bfs')
    expect(planner.playbackSpeed).toBe(4)
    expect(legacyLoad).not.toHaveBeenCalled()
    expect(legacyPlannerClear).not.toHaveBeenCalled()
    expect(
      planner.appendTraceBatch(
        traceBatch('old-request'),
        oldVersion,
        'bfs',
      ),
    ).toBe(false)
    expect(
      planner.complete(
        'old-request',
        plannerResult,
        8,
        oldVersion,
        'bfs',
      ),
    ).toBe(false)
    expect(grid.version).toBe(oldVersion + 1)
  })
})
