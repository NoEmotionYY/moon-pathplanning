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
import type {
  ImageTransformState,
  MazeImportError,
} from '@/types/import'
import type {
  EntranceRole,
  ManualEntranceSelection,
  ManualEntranceSelectionValidation,
  EntranceSelectionSource,
} from '@/types/mazeImportSelection'
import type { MazeImportPipelineProgress } from '@/types/mazeImportPipeline'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import type {
  MazeImportConfirmationSummary,
} from '@/types/mazeImportApplication'
import type {
  MapImportCapability,
  MapImportTransactionError,
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import { assertImageMatrix } from '@/services/import/imageDataValidation'
import {
  swapManualEntranceSelection as swapSelection,
  validateManualEntranceSelection,
} from '@/services/import/manualEntranceSelection'
import {
  useMazeImportAnalysis,
  type MazeImportAnalysisFactory,
  type MazeImportAnalysisStatus,
  type UseMazeImportAnalysis,
} from './useMazeImportAnalysis'
import { useRasterImageImport } from './useRasterImageImport'
import {
  useMazeMapApplication,
  type UseMazeMapApplication,
} from './useMazeMapApplication'
import { useGridStore } from '@/stores/grid'

export type MazeImportViewStep = 'source' | 'analyzing' | 'result'
export type RasterImageImport = ReturnType<typeof useRasterImageImport>
export interface UseMazeImportWizardOptions {
  raster?: RasterImageImport
  analysisFactory?: MazeImportAnalysisFactory
  grid?: Pick<ReturnType<typeof useGridStore>, 'version'>
  applicationFactory?: (
    document: Readonly<Ref<import('@/types/grid').GridMapDocument | null>>,
  ) => UseMazeMapApplication
}

export interface UseMazeImportWizard {
  raster: RasterImageImport
  step: Readonly<Ref<MazeImportViewStep>>
  canAnalyze: Readonly<ComputedRef<boolean>>
  canSelectEntrances: Readonly<ComputedRef<boolean>>
  canApplyManualSelection: Readonly<ComputedRef<boolean>>
  isApplyingEntranceSelection: Readonly<Ref<boolean>>
  needsLowConfidenceConfirmation: Readonly<Ref<boolean>>
  isResultStale: Readonly<Ref<boolean>>
  analysisBaseMapVersion: Readonly<Ref<number | null>>
  analysisResultVersion: Readonly<Ref<number>>
  isMapPreviewStale: Readonly<ComputedRef<boolean>>
  canShowImportAction: Readonly<ComputedRef<boolean>>
  canConfirmImport: Readonly<ComputedRef<boolean>>
  isImportConfirmationOpen: Readonly<ComputedRef<boolean>>
  isApplyingMap: Readonly<ComputedRef<boolean>>
  importApplicationError:
    Readonly<Ref<MapImportTransactionError | null>>
  importApplicationWarnings: Readonly<Ref<readonly string[]>>
  importCapability: Readonly<ComputedRef<MapImportCapability | null>>
  importConfirmationSummary:
    Readonly<ComputedRef<MazeImportConfirmationSummary | null>>
  analysisStatus: Readonly<Ref<MazeImportAnalysisStatus>>
  progress: Readonly<ShallowRef<MazeImportPipelineProgress | null>>
  result: Readonly<ShallowRef<MazeImportWorkerResult | null>>
  analysisError: Readonly<Ref<MazeImportError | null>>
  manualSelection: Readonly<Ref<ManualEntranceSelection>>
  manualSelectionValidation:
    Readonly<ComputedRef<ManualEntranceSelectionValidation>>
  entranceSelectionSource: Readonly<Ref<EntranceSelectionSource>>
  appliedEntranceSelection:
    Readonly<Ref<ManualEntranceSelection | null>>
  startAnalysis(): Promise<void>
  cancelAnalysis(): void
  setManualEntrance(role: EntranceRole, candidateId: string): void
  clearManualEntranceSelection(): void
  swapManualEntrances(): void
  applyManualEntranceSelection(): Promise<void>
  confirmLowConfidenceSelection(): Promise<void>
  cancelLowConfidenceConfirmation(): void
  swapAppliedEntrances(): Promise<void>
  openImportConfirmation(): void
  cancelImportConfirmation(): void
  confirmMapImport(): Promise<MapImportTransactionResult | null>
  returnToSource(): void
  invalidateResult(): void
  resetWizard(): void
  disposeWizard(): void
}

interface RestoreState {
  result: MazeImportWorkerResult
  status: MazeImportAnalysisStatus
  source: EntranceSelectionSource
  appliedSelection: ManualEntranceSelection | null
  resultIdentity: number
}

const EMPTY_SELECTION = (): ManualEntranceSelection => ({
  startCandidateId: null,
  goalCandidateId: null,
})

const EMPTY_VALIDATION = (): ManualEntranceSelectionValidation => ({
  valid: false,
  sameCandidate: false,
  connected: false,
  pairExists: false,
  startCandidateExists: false,
  goalCandidateExists: false,
  warnings: ['当前没有可供选择的入口候选。'],
})

const SELECTABLE_STATUSES = new Set([
  'ambiguous',
  'low-confidence',
  'disconnected',
])

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

const copySelection = (
  selection: ManualEntranceSelection | null,
): ManualEntranceSelection | null =>
  selection ? { ...selection } : null

const transformSnapshot = (
  transform: ImageTransformState,
): Readonly<ImageTransformState> =>
  Object.freeze({
    rotation: transform.rotation,
    flipHorizontal: transform.flipHorizontal,
    flipVertical: transform.flipVertical,
    invert: transform.invert,
  })

export function useMazeImportWizard(
  options: UseMazeImportWizardOptions = {},
): UseMazeImportWizard {
  const raster = options.raster ?? useRasterImageImport()
  const grid = options.grid ?? useGridStore()
  const analysisFactory =
    options.analysisFactory ?? useMazeImportAnalysis
  const step = ref<MazeImportViewStep>('source')
  const isResultStale = ref(false)
  const analysisBaseMapVersion = ref<number | null>(null)
  const analysisResultVersion = ref(0)
  const analysisStatus = ref<MazeImportAnalysisStatus>('idle')
  const progress = shallowRef<MazeImportPipelineProgress | null>(null)
  const result = shallowRef<MazeImportWorkerResult | null>(null)
  const analysisError = ref<MazeImportError | null>(null)
  const manualSelection = ref<ManualEntranceSelection>(EMPTY_SELECTION())
  const entranceSelectionSource = ref<EntranceSelectionSource>(null)
  const appliedEntranceSelection =
    ref<ManualEntranceSelection | null>(null)
  const isApplyingEntranceSelection = ref(false)
  const needsLowConfidenceConfirmation = ref(false)
  let analysis: UseMazeImportAnalysis | null = null
  let operationId = 0
  let resultIdentity = 0
  let analyzedTransform: Readonly<ImageTransformState> | null = null
  let restoreState: RestoreState | null = null
  const resultDocument = computed(() => result.value?.document ?? null)
  const application = (
    options.applicationFactory ?? useMazeMapApplication
  )(resultDocument)
  const isMapPreviewStale = computed(
    () =>
      analysisBaseMapVersion.value !== null &&
      grid.version !== analysisBaseMapVersion.value,
  )
  const canShowImportAction = computed(
    () =>
      step.value === 'result' &&
      analysisStatus.value === 'success' &&
      result.value?.status === 'success' &&
      result.value.document !== null,
  )
  const canConfirmImport = computed(
    () =>
      canShowImportAction.value &&
      analysisBaseMapVersion.value !== null &&
      !isMapPreviewStale.value &&
      !isResultStale.value &&
      analysisStatus.value !== 'running' &&
      !isApplyingEntranceSelection.value &&
      !application.isApplying.value &&
      application.capability.value?.allowed === true,
  )
  const isImportConfirmationOpen = computed(
    () => application.status.value === 'confirming',
  )
  const importConfirmationSummary = computed<
    MazeImportConfirmationSummary | null
  >(() => {
    const document = resultDocument.value
    const previousMapVersion = analysisBaseMapVersion.value
    if (!document || previousMapVersion === null) return null
    return {
      width: document.width,
      height: document.height,
      obstacleCount: document.obstacles.length,
      terrainCount: document.terrain.length,
      start: [document.start[0], document.start[1]],
      goal: [document.goal[0], document.goal[1]],
      movement: document.movement,
      previousMapVersion,
    }
  })

  const canAnalyze = computed(
    () =>
      analysisStatus.value !== 'running' &&
      !application.isApplying.value &&
      application.status.value !== 'confirming' &&
      !raster.isLoading.value &&
      raster.error.value === null &&
      isRasterFileType(raster.fileType.value) &&
      isValidMatrix(raster.decodedImage.value),
  )
  const canSelectEntrances = computed(() => {
    const selection = result.value?.entranceSelection
    return Boolean(
      selection &&
      SELECTABLE_STATUSES.has(selection.status) &&
      selection.candidates.length >= 2 &&
      (
        analysisStatus.value === 'manual-input-required' ||
        analysisStatus.value === 'failed'
      ) &&
      !application.isApplying.value,
    )
  })
  const manualSelectionValidation = computed(() => {
    const summary = result.value?.entranceSelection
    return summary
      ? validateManualEntranceSelection(manualSelection.value, summary)
      : EMPTY_VALIDATION()
  })
  const canApplyManualSelection = computed(
    () =>
      canSelectEntrances.value &&
      manualSelectionValidation.value.valid &&
      !isApplyingEntranceSelection.value &&
      !application.isApplying.value,
  )

  const ensureAnalysis = (): UseMazeImportAnalysis => {
    analysis ??= analysisFactory()
    return analysis
  }

  const resetSelectionState = (): void => {
    manualSelection.value = EMPTY_SELECTION()
    entranceSelectionSource.value = null
    appliedEntranceSelection.value = null
    isApplyingEntranceSelection.value = false
    needsLowConfidenceConfirmation.value = false
    restoreState = null
  }

  const clearResultState = (): void => {
    step.value = 'source'
    progress.value = null
    result.value = null
    analysisError.value = null
    analyzedTransform = null
    analysisBaseMapVersion.value = null
    analysisResultVersion.value += 1
    application.resetApplication()
    resetSelectionState()
  }

  const selectionRequiresConfirmation = (
    summary: NonNullable<MazeImportWorkerResult['entranceSelection']>,
    selection: ManualEntranceSelection,
  ): boolean => {
    const selectedCandidates = summary.candidates.filter((candidate) =>
      candidate.id === selection.startCandidateId ||
      candidate.id === selection.goalCandidateId)
    const pair = summary.pairCandidates.find((candidatePair) =>
      (candidatePair.firstCandidateId === selection.startCandidateId &&
        candidatePair.secondCandidateId === selection.goalCandidateId) ||
      (candidatePair.firstCandidateId === selection.goalCandidateId &&
        candidatePair.secondCandidateId === selection.startCandidateId))
    return (
      summary.status === 'low-confidence' ||
      selectedCandidates.some((candidate) => candidate.state !== 'reliable') ||
      pair?.warnings.includes('ENTRANCE_PAIR_LOW_CONFIDENCE') === true
    )
  }

  const updateProgress = (
    currentOperation: number,
    update: MazeImportPipelineProgress,
  ): void => {
    if (currentOperation !== operationId) return
    const previous = progress.value?.progress ?? 0
    progress.value = {
      ...update,
      progress: Math.max(previous, update.progress),
    }
  }

  const startAnalysis = async (): Promise<void> => {
    if (
      !canAnalyze.value ||
      analysisStatus.value === 'running' ||
      application.isApplying.value
    ) return
    const decoded = raster.decodedImage.value
    if (!decoded) return

    const currentOperation = ++operationId
    const snapshot = transformSnapshot(raster.transformState.value)
    const baseMapVersion = grid.version
    const service = ensureAnalysis()
    service.reset()
    step.value = 'analyzing'
    analysisStatus.value = 'running'
    progress.value = null
    result.value = null
    analysisError.value = null
    analyzedTransform = snapshot
    analysisBaseMapVersion.value = baseMapVersion
    analysisResultVersion.value += 1
    application.resetApplication()
    resetSelectionState()
    isResultStale.value = false

    const completed = await service.analyze(decoded.matrix, {
      pipeline: { transform: snapshot },
      resultDetail: 'preview',
      onProgress: (update) => updateProgress(currentOperation, update),
    })
    if (currentOperation !== operationId) return

    analysisStatus.value = service.status.value
    if (completed) {
      result.value = completed
      resultIdentity += 1
      analysisResultVersion.value += 1
      step.value = 'result'
      if (
        completed.status === 'success' &&
        completed.conversion?.startCandidateId &&
        completed.conversion.goalCandidateId
      ) {
        entranceSelectionSource.value = 'automatic'
        appliedEntranceSelection.value = {
          startCandidateId: completed.conversion.startCandidateId,
          goalCandidateId: completed.conversion.goalCandidateId,
        }
      }
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

  const runManualAnalysis = async (
    requestedSelection: ManualEntranceSelection,
    allowLowConfidence: boolean,
  ): Promise<void> => {
    const decoded = raster.decodedImage.value
    const currentResult = result.value
    const snapshot = analyzedTransform
    if (
      !decoded ||
      !currentResult ||
      !snapshot ||
      !requestedSelection.startCandidateId ||
      !requestedSelection.goalCandidateId
    ) {
      return
    }
    const currentOperation = ++operationId
    const sourceIdentity = resultIdentity
    restoreState = {
      result: currentResult,
      status: analysisStatus.value,
      source: entranceSelectionSource.value,
      appliedSelection: copySelection(appliedEntranceSelection.value),
      resultIdentity: sourceIdentity,
    }
    const service = ensureAnalysis()
    service.reset()
    isApplyingEntranceSelection.value = true
    needsLowConfidenceConfirmation.value = false
    step.value = 'analyzing'
    analysisStatus.value = 'running'
    progress.value = null
    result.value = null
    analysisError.value = null

    const completed = await service.analyze(decoded.matrix, {
      pipeline: {
        transform: snapshot,
        manualEntrancePair: {
          firstCandidateId: requestedSelection.startCandidateId,
          secondCandidateId: requestedSelection.goalCandidateId,
        },
        gridConversion: {
          allowLowConfidenceManualPair: allowLowConfidence,
        },
      },
      resultDetail: 'preview',
      onProgress: (update) => updateProgress(currentOperation, update),
    })
    if (
      currentOperation !== operationId ||
      sourceIdentity !== restoreState?.resultIdentity
    ) {
      return
    }

    isApplyingEntranceSelection.value = false
    analysisStatus.value = service.status.value
    if (completed?.status === 'success') {
      result.value = completed
      resultIdentity += 1
      analysisResultVersion.value += 1
      entranceSelectionSource.value = 'manual'
      appliedEntranceSelection.value = { ...requestedSelection }
      step.value = 'result'
      restoreState = null
      return
    }
    if (completed?.status === 'manual-input-required') {
      result.value = completed
      resultIdentity += 1
      analysisResultVersion.value += 1
      entranceSelectionSource.value = null
      appliedEntranceSelection.value = null
      step.value = 'result'
      restoreState = null
      return
    }

    const previous = restoreState
    if (previous) {
      result.value = previous.result
      entranceSelectionSource.value = previous.source
      appliedEntranceSelection.value = copySelection(
        previous.appliedSelection,
      )
    }
    analysisStatus.value = completed?.status === 'unsupported-topology'
      ? 'unsupported-topology'
      : 'failed'
    analysisError.value = completed?.error
      ? {
          code: completed.error.code,
          message: completed.error.message,
        }
      : service.error.value
        ? {
            code: service.error.value.code,
            message: service.error.value.message,
          }
        : {
            code: 'MAZE_IMPORT_MANUAL_SELECTION_FAILED',
            message: '入口选择未能生成地图预览，请调整后重试。',
          }
    step.value = 'result'
    restoreState = null
  }

  const setManualEntrance = (
    role: EntranceRole,
    candidateId: string,
  ): void => {
    if (!canSelectEntrances.value) return
    const next = { ...manualSelection.value }
    if (role === 'start') {
      next.startCandidateId = candidateId
      if (next.goalCandidateId === candidateId) next.goalCandidateId = null
    } else {
      next.goalCandidateId = candidateId
      if (next.startCandidateId === candidateId) next.startCandidateId = null
    }
    manualSelection.value = next
    needsLowConfidenceConfirmation.value = false
  }

  const clearManualEntranceSelection = (): void => {
    manualSelection.value = EMPTY_SELECTION()
    needsLowConfidenceConfirmation.value = false
  }

  const swapManualEntrances = (): void => {
    manualSelection.value = swapSelection(manualSelection.value)
    needsLowConfidenceConfirmation.value = false
  }

  const applyManualEntranceSelection = async (): Promise<void> => {
    const summary = result.value?.entranceSelection
    if (!summary || !canApplyManualSelection.value) return
    if (selectionRequiresConfirmation(summary, manualSelection.value)) {
      needsLowConfidenceConfirmation.value = true
      return
    }
    await runManualAnalysis({ ...manualSelection.value }, false)
  }

  const confirmLowConfidenceSelection = async (): Promise<void> => {
    const summary = result.value?.entranceSelection
    if (
      !summary ||
      !needsLowConfidenceConfirmation.value ||
      !canApplyManualSelection.value
    ) {
      return
    }
    needsLowConfidenceConfirmation.value = false
    await runManualAnalysis({ ...manualSelection.value }, true)
  }

  const cancelLowConfidenceConfirmation = (): void => {
    needsLowConfidenceConfirmation.value = false
  }

  const swapAppliedEntrances = async (): Promise<void> => {
    const applied = appliedEntranceSelection.value
    const summary = result.value?.entranceSelection
    if (
      !applied ||
      !summary ||
      analysisStatus.value !== 'success' ||
      application.isApplying.value
    ) return
    const swapped = swapSelection(applied)
    const validation = validateManualEntranceSelection(swapped, summary)
    if (!validation.valid) return
    manualSelection.value = swapped
    await runManualAnalysis(swapped, true)
  }

  const cancelAnalysis = (): void => {
    if (analysisStatus.value !== 'running') return
    operationId += 1
    analysis?.cancel()
    if (isApplyingEntranceSelection.value && restoreState) {
      result.value = restoreState.result
      analysisStatus.value = restoreState.status
      entranceSelectionSource.value = restoreState.source
      appliedEntranceSelection.value = copySelection(
        restoreState.appliedSelection,
      )
      progress.value = null
      analysisError.value = null
      step.value = 'result'
      isApplyingEntranceSelection.value = false
      restoreState = null
      return
    }
    clearResultState()
    analysisStatus.value = 'cancelled'
    analysisError.value = {
      code: 'IMPORT_CANCELLED',
      message: '已取消识别',
    }
  }

  const openImportConfirmation = (): void => {
    if (isMapPreviewStale.value) {
      application.markStalePreview()
      return
    }
    if (!canShowImportAction.value) return
    application.requestConfirmation()
  }

  const cancelImportConfirmation = (): void => {
    application.cancelConfirmation()
  }

  const confirmMapImport =
    async (): Promise<MapImportTransactionResult | null> => {
      const document = resultDocument.value
      const expectedMapVersion = analysisBaseMapVersion.value
      if (
        !document ||
        expectedMapVersion === null ||
        !isImportConfirmationOpen.value ||
        !canConfirmImport.value
      ) {
        if (isMapPreviewStale.value) application.markStalePreview()
        return null
      }
      return application.applyDocument(document, expectedMapVersion)
    }

  const invalidateResult = (): void => {
    if (application.isApplying.value) return
    const hadCurrentAnalysis =
      analysisStatus.value === 'running' ||
      result.value !== null ||
      step.value === 'result'
    operationId += 1
    if (analysisStatus.value === 'running') analysis?.cancel()
    else analysis?.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    if (hadCurrentAnalysis) isResultStale.value = true
  }

  const returnToSource = (): void => {
    if (application.isApplying.value) return
    operationId += 1
    analysis?.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    isResultStale.value = false
  }

  const resetWizard = (): void => {
    if (application.isApplying.value) return
    operationId += 1
    analysis?.reset()
    raster.reset()
    clearResultState()
    analysisStatus.value = 'idle'
    isResultStale.value = false
  }

  const disposeWizard = (): void => {
    if (application.isApplying.value) return
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

  watch(
    isMapPreviewStale,
    (stale) => {
      if (stale) application.markStalePreview()
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) onScopeDispose(disposeWizard)

  return {
    raster,
    step: readonly(step),
    canAnalyze,
    canSelectEntrances,
    canApplyManualSelection,
    isApplyingEntranceSelection: readonly(isApplyingEntranceSelection),
    needsLowConfidenceConfirmation:
      readonly(needsLowConfidenceConfirmation),
    isResultStale: readonly(isResultStale),
    analysisBaseMapVersion: readonly(analysisBaseMapVersion),
    analysisResultVersion: readonly(analysisResultVersion),
    isMapPreviewStale,
    canShowImportAction,
    canConfirmImport,
    isImportConfirmationOpen,
    isApplyingMap: application.isApplying,
    importApplicationError: application.error,
    importApplicationWarnings: application.warnings,
    importCapability: application.capability,
    importConfirmationSummary,
    analysisStatus: readonly(analysisStatus),
    progress: shallowReadonly(progress),
    result: shallowReadonly(result),
    analysisError: readonly(analysisError),
    manualSelection: readonly(manualSelection),
    manualSelectionValidation,
    entranceSelectionSource: readonly(entranceSelectionSource),
    appliedEntranceSelection: readonly(appliedEntranceSelection),
    startAnalysis,
    cancelAnalysis,
    setManualEntrance,
    clearManualEntranceSelection,
    swapManualEntrances,
    applyManualEntranceSelection,
    confirmLowConfidenceSelection,
    cancelLowConfidenceConfirmation,
    swapAppliedEntrances,
    openImportConfirmation,
    cancelImportConfirmation,
    confirmMapImport,
    returnToSource,
    invalidateResult,
    resetWizard,
    disposeWizard,
  }
}
