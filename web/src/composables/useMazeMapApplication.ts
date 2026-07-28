import {
  computed,
  readonly,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue'
import {
  applyMapDocumentTransaction,
  createMapImportTransactionDependencies,
  type MapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import { getMapImportCapability } from '@/services/import/mapImportCapability'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type {
  MazeImportApplicationStatus,
} from '@/types/mazeImportApplication'
import type {
  MapImportCapability,
  MapImportTransactionError,
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'

export interface UseMazeMapApplicationOptions {
  transaction?: typeof applyMapDocumentTransaction
  createDependencies?: (
    grid: ReturnType<typeof useGridStore>,
    planner: ReturnType<typeof usePlannerStore>,
  ) => MapImportTransactionDependencies
}

export interface UseMazeMapApplication {
  status: Readonly<Ref<MazeImportApplicationStatus>>
  error: Readonly<Ref<MapImportTransactionError | null>>
  warnings: Readonly<Ref<readonly string[]>>
  isApplying: Readonly<ComputedRef<boolean>>
  capability: Readonly<ComputedRef<MapImportCapability | null>>
  requestConfirmation(): void
  cancelConfirmation(): void
  markStalePreview(): void
  applyDocument(
    document: GridMapDocument,
    expectedMapVersion: number,
  ): Promise<MapImportTransactionResult>
  resetApplication(): void
}

const localBusyResult = (): MapImportTransactionResult => ({
  status: 'busy',
  applied: false,
  metrics: null,
  error: {
    code: 'MAP_IMPORT_TRANSACTION_BUSY',
    message: '另一项地图导入正在执行，请稍后重试。',
  },
  warnings: [],
})

const displayError = (
  error: MapImportTransactionError | null,
): MapImportTransactionError | null => {
  if (!error) return null
  if (error.code === 'MAP_IMPORT_STALE_PREVIEW') {
    return {
      code: error.code,
      message: '当前地图已发生变化，请重新识别后再导入。',
    }
  }
  if (error.code === 'MAP_IMPORT_TRANSACTION_BUSY') {
    return {
      code: error.code,
      message: '另一项地图导入正在执行，请稍后重试。',
    }
  }
  if (error.code === 'MAP_IMPORT_TRANSACTION_ROLLED_BACK') {
    return {
      code: error.code,
      message:
        '导入失败，原地图状态已经恢复。之前运行的路径规划任务已取消。',
    }
  }
  return error
}

const statusForResult = (
  result: MapImportTransactionResult,
): MazeImportApplicationStatus => {
  if (result.status === 'success' && result.applied) return 'success'
  if (result.error?.code === 'MAP_IMPORT_STALE_PREVIEW') return 'stale'
  if (result.error?.code === 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED') {
    return 'size-blocked'
  }
  if (
    result.status === 'busy' ||
    result.error?.code === 'MAP_IMPORT_TRANSACTION_BUSY'
  ) {
    return 'busy'
  }
  return 'failed'
}

export function useMazeMapApplication(
  document: Readonly<Ref<GridMapDocument | null>>,
  options: UseMazeMapApplicationOptions = {},
): UseMazeMapApplication {
  const grid = useGridStore()
  const planner = usePlannerStore()
  const transaction = options.transaction ?? applyMapDocumentTransaction
  const createDependencies =
    options.createDependencies ?? createMapImportTransactionDependencies
  const dependencies = createDependencies(grid, planner)
  const status = ref<MazeImportApplicationStatus>('idle')
  const error = ref<MapImportTransactionError | null>(null)
  const warnings = ref<string[]>([])
  const isApplying = computed(() => status.value === 'applying')
  const capability = computed(() =>
    document.value ? getMapImportCapability(document.value) : null,
  )

  const setCapabilityError = (
    currentCapability: MapImportCapability,
  ): void => {
    status.value = 'size-blocked'
    error.value = currentCapability.error ?? {
      code: 'MAP_IMPORT_CAPABILITY_REJECTED',
      message: '当前地图编辑器无法安全应用该地图。',
    }
    warnings.value = [...currentCapability.warnings]
  }

  const requestConfirmation = (): void => {
    if (isApplying.value) return
    if (!document.value) {
      status.value = 'failed'
      error.value = {
        code: 'MAP_IMPORT_DOCUMENT_MISSING',
        message: '当前识别结果没有可应用的地图文档。',
      }
      warnings.value = []
      return
    }
    const currentCapability = capability.value
    if (!currentCapability?.allowed) {
      if (currentCapability) setCapabilityError(currentCapability)
      return
    }
    status.value = 'confirming'
    error.value = null
    warnings.value = []
  }

  const cancelConfirmation = (): void => {
    if (status.value !== 'confirming') return
    status.value = 'idle'
    error.value = null
    warnings.value = []
  }

  const markStalePreview = (): void => {
    if (isApplying.value) return
    status.value = 'stale'
    error.value = {
      code: 'MAP_IMPORT_STALE_PREVIEW',
      message: '当前地图已发生变化，请重新识别后再导入。',
    }
    warnings.value = []
  }

  const applyDocument = async (
    nextDocument: GridMapDocument,
    expectedMapVersion: number,
  ): Promise<MapImportTransactionResult> => {
    if (isApplying.value) return localBusyResult()
    const currentCapability = getMapImportCapability(nextDocument)
    if (!currentCapability.allowed) {
      setCapabilityError(currentCapability)
      return {
        status: 'failed',
        applied: false,
        metrics: null,
        error: currentCapability.error ?? null,
        warnings: [...currentCapability.warnings],
      }
    }

    status.value = 'applying'
    error.value = null
    warnings.value = []
    const result = await transaction(
      nextDocument,
      {
        source: 'maze-image',
        expectedCurrentMapVersion: expectedMapVersion,
        preserveSelectedAlgorithm: true,
        preservePlaybackSpeed: true,
      },
      dependencies,
    )
    status.value = statusForResult(result)
    error.value = displayError(result.error)
    warnings.value = [...result.warnings]
    return result
  }

  const resetApplication = (): void => {
    if (isApplying.value) return
    status.value = 'idle'
    error.value = null
    warnings.value = []
  }

  return {
    status: readonly(status),
    error: readonly(error),
    warnings: readonly(warnings),
    isApplying,
    capability,
    requestConfirmation,
    cancelConfirmation,
    markStalePreview,
    applyDocument,
    resetApplication,
  }
}
