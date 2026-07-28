import {
  computed,
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
  shallowReadonly,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue'
import type { MazeImportError } from '@/types/import'
import type { MazeImportPipelineProgress } from '@/types/mazeImportPipeline'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import { assertImageMatrix } from '@/services/import/imageDataValidation'
import {
  useMazeImportAnalysis,
  type MazeImportAnalysisFactory,
  type MazeImportAnalysisStatus,
  type UseMazeImportAnalysis,
} from './useMazeImportAnalysis'
import { useRasterImageImport } from './useRasterImageImport'

export type MazeImportViewStep = 'source' | 'analyzing' | 'result'
export type RasterImageImport = ReturnType<typeof useRasterImageImport>

export interface UseMazeImportWizardOptions {
  raster?: RasterImageImport
  analysisFactory?: MazeImportAnalysisFactory
}

export interface UseMazeImportWizard {
  raster: RasterImageImport
  step: Readonly<Ref<MazeImportViewStep>>
  canAnalyze: Readonly<ComputedRef<boolean>>
  isResultStale: Readonly<Ref<boolean>>
  analysisStatus: Readonly<Ref<MazeImportAnalysisStatus>>
  progress: Readonly<ShallowRef<MazeImportPipelineProgress | null>>
  result: Readonly<ShallowRef<MazeImportWorkerResult | null>>
  analysisError: Readonly<Ref<MazeImportError | null>>
  startAnalysis(): Promise<void>
  cancelAnalysis(): void
  returnToSource(): void
  invalidateResult(): void
  resetWizard(): void
  disposeWizard(): void
}

const isRasterFileType = (value: string): boolean =>
  value === 'png' || value === 'jpeg' || value === 'webp'

const isValidMatrix = (
  image: RasterImageImport['decodedImage']['value'],
): boolean => {
  if (!image) return false
  try {
    assertImageMatrix(image.matrix)
    return true
  } catch {
    return false
  }
}

export function useMazeImportWizard(
  options: UseMazeImportWizardOptions = {},
): UseMazeImportWizard {
  const raster = options.raster ?? useRasterImageImport()
  const analysisFactory =
    options.analysisFactory ?? useMazeImportAnalysis
  const step = ref<MazeImportViewStep>('source')
  const isResultStale = ref(false)
  const analysisStatus = ref<MazeImportAnalysisStatus>('idle')
  const progress = shallowRef<MazeImportPipelineProgress | null>(null)
  const result = shallowRef<MazeImportWorkerResult | null>(null)
  const analysisError = ref<MazeImportError | null>(null)
  let analysis: UseMazeImportAnalysis | null = null
  let operationId = 0

  const canAnalyze = computed(
    () =>
      analysisStatus.value !== 'running' &&
      !raster.isLoading.value &&
      raster.error.value === null &&
      isRasterFileType(raster.fileType.value) &&
      isValidMatrix(raster.decodedImage.value),
  )

  const ensureAnalysis = (): UseMazeImportAnalysis => {
    analysis ??= analysisFactory()
    return analysis
  }

  const clearResultState = (): void => {
    step.value = 'source'
    progress.value = null
    result.value = null
    analysisError.value = null
  }

  const cancelAnalysis = (): void => {
    if (analysisStatus.value !== 'running') return
    operationId += 1
    analysis?.cancel()
    clearResultState()
    analysisStatus.value = 'cancelled'
    analysisError.value = {
      code: 'IMPORT_CANCELLED',
      message: '已取消识别',
    }
  }

  const invalidateResult = (): void => {
    const hadCurrentAnalysis =
      analysisStatus.value === 'running' ||
      result.value !== null ||
      step.value === 'result'
    if (analysisStatus.value === 'running') {
      cancelAnalysis()
    } else {
      analysis?.reset()
      clearResultState()
      analysisStatus.value = 'idle'
    }
    if (hadCurrentAnalysis) isResultStale.value = true
  }

  const startAnalysis = async (): Promise<void> => {
    if (!canAnalyze.value || analysisStatus.value === 'running') return
    const decoded = raster.decodedImage.value
    if (!decoded) return

    const currentOperation = ++operationId
    const transformSnapshot = Object.freeze({
      rotation: raster.transformState.value.rotation,
      flipHorizontal: raster.transformState.value.flipHorizontal,
      flipVertical: raster.transformState.value.flipVertical,
      invert: raster.transformState.value.invert,
    })
    const service = ensureAnalysis()
    service.reset()
    step.value = 'analyzing'
    analysisStatus.value = 'running'
    progress.value = null
    result.value = null
    analysisError.value = null
    isResultStale.value = false

    const completed = await service.analyze(decoded.matrix, {
      pipeline: { transform: transformSnapshot },
      resultDetail: 'preview',
      onProgress: (update) => {
        if (currentOperation !== operationId) return
        const previous = progress.value?.progress ?? 0
        progress.value = {
          ...update,
          progress: Math.max(previous, update.progress),
        }
      },
    })
    if (currentOperation !== operationId) return

    analysisStatus.value = service.status.value
    if (completed) {
      result.value = completed
      step.value = 'result'
      return
    }
    analysisError.value = service.error.value
      ? {
          code: service.error.value.code,
          message: service.error.value.message,
        }
      : {
          code: 'MAZE_IMPORT_ANALYSIS_FAILED',
          message: '迷宫识别未返回结果。',
        }
    step.value = service.status.value === 'cancelled' ? 'source' : 'result'
  }

  const returnToSource = (): void => {
    operationId += 1
    analysis?.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    isResultStale.value = false
  }

  const resetWizard = (): void => {
    operationId += 1
    analysis?.reset()
    raster.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    isResultStale.value = false
  }

  const disposeWizard = (): void => {
    operationId += 1
    analysis?.dispose()
    analysis = null
    raster.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    isResultStale.value = false
  }

  watch(
    [
      () => raster.selectedFile.value,
      () => raster.decodedImage.value,
      () => raster.transformState.value.rotation,
      () => raster.transformState.value.flipHorizontal,
      () => raster.transformState.value.flipVertical,
      () => raster.transformState.value.invert,
    ],
    () => {
      if (
        analysisStatus.value === 'running' ||
        result.value !== null ||
        step.value === 'result'
      ) {
        invalidateResult()
      }
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) onScopeDispose(disposeWizard)

  return {
    raster,
    step: readonly(step),
    canAnalyze,
    isResultStale: readonly(isResultStale),
    analysisStatus: readonly(analysisStatus),
    progress: shallowReadonly(progress),
    result: shallowReadonly(result),
    analysisError: readonly(analysisError),
    startAnalysis,
    cancelAnalysis,
    returnToSource,
    invalidateResult,
    resetWizard,
    disposeWizard,
  }
}
