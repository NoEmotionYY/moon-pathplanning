import {
  computed,
  readonly,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue'
import { IMPORT_FILE_SIZE_LIMITS } from '@/config/importLimits'
import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import {
  applyMapDocumentTransaction,
  createMapImportTransactionDependencies,
  type MapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import { detectImportFileType } from '@/services/import/fileTypeDetector'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type {
  MapImportTransactionError,
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import { downloadText } from '@/utils/download'
import { validateGridDocument } from '@/utils/validation'
import { useToast } from './useToast'

const exampleNames = [
  'simple_grid',
  'weighted_grid',
  'rs_apso_20x20_simple',
  'rs_apso_20x20_complex',
  'complex_maze',
] as const

export type ExampleName = (typeof exampleNames)[number]

export type MapFileApplicationStatus =
  | 'idle'
  | 'reading'
  | 'applying'
  | 'success'
  | 'failed'
  | 'stale'
  | 'size-blocked'
  | 'busy'

export class MapFileImportError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'MapFileImportError'
  }
}

export interface UseMapImportExportOptions {
  transaction?: typeof applyMapDocumentTransaction
  createDependencies?: (
    grid: ReturnType<typeof useGridStore>,
    planner: ReturnType<typeof usePlannerStore>,
  ) => MapImportTransactionDependencies
  fetcher?: typeof fetch
}

export interface UseMapImportExport {
  importStatus: Readonly<Ref<MapFileApplicationStatus>>
  importError: Readonly<Ref<MapImportTransactionError | null>>
  isImporting: Readonly<ComputedRef<boolean>>
  importFile(file: File): Promise<void>
  exportMap(): void
  loadExample(name: ExampleName): Promise<void>
  resetImportState(): void
  exampleNames: readonly ExampleName[]
}

const statusForError = (code: string): MapFileApplicationStatus => {
  if (code === 'MAP_IMPORT_STALE_PREVIEW') return 'stale'
  if (code === 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED') return 'size-blocked'
  if (code === 'MAP_IMPORT_TRANSACTION_BUSY') return 'busy'
  return 'failed'
}

const displayError = (
  error: MapImportTransactionError,
  context: 'json' | 'example',
): MapFileImportError => {
  if (error.code === 'MAP_IMPORT_STALE_PREVIEW') {
    return new MapFileImportError(
      error.code,
      context === 'json'
        ? '当前地图已在文件读取期间发生变化，请重新选择 JSON 文件。'
        : '当前地图已在示例加载期间发生变化，请重新加载示例地图。',
    )
  }
  if (error.code === 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED') {
    return new MapFileImportError(
      error.code,
      'JSON 地图超过当前编辑器 60×60 的正式导入上限。',
    )
  }
  if (error.code === 'MAP_IMPORT_TRANSACTION_BUSY') {
    return new MapFileImportError(
      error.code,
      '另一项地图导入正在执行，请稍后重试。',
    )
  }
  if (error.code === 'MAP_IMPORT_TRANSACTION_ROLLED_BACK') {
    return new MapFileImportError(
      error.code,
      'JSON 地图导入失败，原地图状态已经恢复。之前运行的规划任务已取消。',
    )
  }
  return new MapFileImportError(error.code, error.message)
}

const parseJsonDocument = (text: string): GridMapDocument => {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new MapFileImportError(
      'MAP_FILE_JSON_INVALID',
      '无法解析 JSON 文件，请检查文件内容。',
    )
  }

  try {
    validateGridDocument(value, { maximumSize: MAP_SIZE_LIMITS.hardMax })
  } catch (error) {
    throw new MapFileImportError(
      'MAP_IMPORT_INVALID_DOCUMENT',
      error instanceof Error ? error.message : 'JSON 地图文档无效。',
    )
  }
  return value
}

const validateJsonFile = (file: File): void => {
  const detection = detectImportFileType(file)
  const mimeIsUnknown =
    detection.normalizedMime === '' ||
    detection.normalizedMime === 'application/octet-stream'
  if (
    detection.extensionType !== 'json' ||
    detection.conflict ||
    (!mimeIsUnknown && detection.mimeType !== 'json')
  ) {
    throw new MapFileImportError(
      'MAP_FILE_TYPE_UNSUPPORTED',
      '请选择扩展名和 MIME 类型均有效的 JSON 地图文件。',
    )
  }
  if (file.size > IMPORT_FILE_SIZE_LIMITS.json) {
    throw new MapFileImportError(
      'MAP_FILE_TOO_LARGE',
      'JSON 地图文件不能超过 1 MiB。',
    )
  }
}

const readFileText = async (file: File): Promise<string> => {
  try {
    return await file.text()
  } catch {
    throw new MapFileImportError(
      'MAP_FILE_READ_FAILED',
      '读取 JSON 地图文件失败，请重新选择文件。',
    )
  }
}

export const useMapImportExport = (
  options: UseMapImportExportOptions = {},
): UseMapImportExport => {
  const grid = useGridStore()
  const planner = usePlannerStore()
  const toast = useToast()
  const transaction = options.transaction ?? applyMapDocumentTransaction
  const createDependencies =
    options.createDependencies ?? createMapImportTransactionDependencies
  const dependencies = createDependencies(grid, planner)
  const fetcher = options.fetcher ?? fetch
  const importStatus = ref<MapFileApplicationStatus>('idle')
  const importError = ref<MapImportTransactionError | null>(null)
  const isImporting = computed(
    () =>
      importStatus.value === 'reading' ||
      importStatus.value === 'applying',
  )

  const rejectConcurrentOperation = (): never => {
    throw new MapFileImportError(
      'MAP_IMPORT_TRANSACTION_BUSY',
      '地图文件正在读取或应用，请等待当前操作完成。',
    )
  }

  const recordFailure = (
    error: MapFileImportError,
  ): MapFileImportError => {
    importStatus.value = statusForError(error.code)
    importError.value = {
      code: error.code,
      message: error.message,
    }
    return error
  }

  const applyImportedDocument = async (
    document: GridMapDocument,
    expectedMapVersion: number,
    context: 'json' | 'example',
  ): Promise<MapImportTransactionResult> => {
    importStatus.value = 'applying'
    const result = await transaction(
      document,
      {
        source: 'json',
        expectedCurrentMapVersion: expectedMapVersion,
        preserveSelectedAlgorithm: true,
        preservePlaybackSpeed: true,
      },
      dependencies,
    )
    if (result.status === 'success' && result.applied) {
      importStatus.value = 'success'
      importError.value = null
      return result
    }
    throw displayError(
      result.error ?? {
        code: 'MAP_IMPORT_TRANSACTION_FAILED',
        message: '地图导入事务未能完成。',
      },
      context,
    )
  }

  const importFile = async (
    file: File,
  ): Promise<void> => {
    if (isImporting.value) return rejectConcurrentOperation()
    const expectedMapVersion = grid.version
    importStatus.value = 'reading'
    importError.value = null
    try {
      validateJsonFile(file)
      const document = parseJsonDocument(await readFileText(file))
      await applyImportedDocument(
        document,
        expectedMapVersion,
        'json',
      )
      toast.show(`已导入 ${file.name}`, 'success')
    } catch (error) {
      throw recordFailure(
        error instanceof MapFileImportError
          ? error
          : new MapFileImportError(
              'MAP_IMPORT_TRANSACTION_FAILED',
              error instanceof Error ? error.message : 'JSON 地图导入失败。',
            ),
      )
    }
  }

  const exportMap = () => {
    const now = new Date().toISOString().slice(0, 10)
    const filename = `moon-grid-${grid.width}x${grid.height}-${now}.json`
    downloadText(JSON.stringify(grid.toDocument(), null, 2), filename)
    toast.show('地图 JSON 已导出', 'success')
  }

  const loadExample = async (
    name: ExampleName,
  ): Promise<void> => {
    if (isImporting.value) return rejectConcurrentOperation()
    const expectedMapVersion = grid.version
    importStatus.value = 'reading'
    importError.value = null
    try {
      if (!exampleNames.includes(name)) {
        throw new MapFileImportError(
          'MAP_EXAMPLE_UNKNOWN',
          '未知的示例地图。',
        )
      }
      let response: Response
      try {
        response = await fetcher(
          `${import.meta.env.BASE_URL}examples/${name}.json`,
        )
      } catch {
        throw new MapFileImportError(
          'MAP_EXAMPLE_FETCH_FAILED',
          '无法加载示例地图。',
        )
      }
      if (!response.ok) {
        throw new MapFileImportError(
          'MAP_EXAMPLE_FETCH_FAILED',
          '无法加载示例地图。',
        )
      }
      let text: string
      try {
        text = await response.text()
      } catch {
        throw new MapFileImportError(
          'MAP_FILE_READ_FAILED',
          '读取示例地图失败。',
        )
      }
      const document = parseJsonDocument(text)
      await applyImportedDocument(
        document,
        expectedMapVersion,
        'example',
      )
      toast.show('示例地图已加载', 'success')
    } catch (error) {
      throw recordFailure(
        error instanceof MapFileImportError
          ? error
          : new MapFileImportError(
              'MAP_IMPORT_TRANSACTION_FAILED',
              error instanceof Error ? error.message : '示例地图加载失败。',
            ),
      )
    }
  }

  const resetImportState = (): void => {
    if (isImporting.value) return
    importStatus.value = 'idle'
    importError.value = null
  }

  return {
    importStatus: readonly(importStatus),
    importError: readonly(importError),
    isImporting,
    importFile,
    exportMap,
    loadExample,
    resetImportState,
    exampleNames,
  }
}
