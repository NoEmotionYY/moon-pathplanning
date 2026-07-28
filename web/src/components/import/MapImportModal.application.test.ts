import {
  computed,
  createApp,
  h,
  nextTick,
  ref,
  shallowRef,
} from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkerResultWithEntrances,
} from '@/services/import/testUtils/mazeImportWorkerFixtures'
import type { GridMapDocument } from '@/types/grid'
import type {
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import type {
  MazeImportAnalysisStatus,
} from '@/composables/useMazeImportAnalysis'
import { useToast } from '@/composables/useToast'

const createDocument = (size = 41): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width: size,
  height: size,
  start: [1, 0],
  goal: [size - 2, size - 1],
  movement: 'four_way',
  obstacles: [[0, 0], [2, 0]],
  terrain: [],
})

const successWorkerResult = (size = 41) => ({
  ...createWorkerResultWithEntrances('success', 'selected'),
  document: createDocument(size),
})

const successTransaction = (): MapImportTransactionResult => ({
  status: 'success',
  applied: true,
  metrics: {
    previousMapVersion: 2,
    nextMapVersion: 3,
    width: 41,
    height: 41,
    obstacleCount: 2,
    terrainCount: 0,
    plannerWasRunning: false,
    traceWasActive: false,
    timing: {
      validationMs: 0,
      snapshotMs: 0,
      bulkApplyMs: 0,
      postconditionMs: 0,
      totalMs: 0,
    },
  },
  error: null,
  warnings: [],
})

const harness = vi.hoisted(() => ({
  state: null as Record<string, unknown> | null,
  confirmMapImport: vi.fn(),
  disposeWizard: vi.fn(),
}))

vi.mock('@/composables/useMazeImportWizard', () => ({
  useMazeImportWizard: () => {
    const step = ref<'source' | 'analyzing' | 'result'>('result')
    const analysisStatus = ref<MazeImportAnalysisStatus>('success')
    const result = shallowRef(successWorkerResult())
    const isApplyingMap = ref(false)
    const isImportConfirmationOpen = ref(false)
    const isMapPreviewStale = ref(false)
    const importApplicationError = ref<{
      code: string
      message: string
    } | null>(null)
    const capability = computed(() => {
      const current = result.value.document
      if (!current) return null
      const allowed = current.width <= 60 && current.height <= 60
      return {
        allowed,
        maximumImportWidth: 60,
        maximumImportHeight: 60,
        supportsLargeGridRendering: false,
        warnings: [],
        error: allowed
          ? undefined
          : {
              code: 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED',
              message: '超过正式上限。',
            },
      }
    })
    const canShowImportAction = computed(
      () =>
        step.value === 'result' &&
        analysisStatus.value === 'success' &&
        result.value.document !== null,
    )
    const canConfirmImport = computed(
      () =>
        canShowImportAction.value &&
        capability.value?.allowed === true &&
        !isMapPreviewStale.value &&
        !isApplyingMap.value,
    )
    const importConfirmationSummary = computed(() => {
      const current = result.value.document
      if (!current) return null
      return {
        width: current.width,
        height: current.height,
        obstacleCount: current.obstacles.length,
        terrainCount: current.terrain.length,
        start: current.start,
        goal: current.goal,
        movement: current.movement,
        previousMapVersion: 2,
      }
    })
    const raster = {
      selectedFile: shallowRef(new File(['maze'], 'maze.png')),
      decodedImage: shallowRef(null),
      transformedImage: shallowRef(null),
      fileType: ref('png'),
      transformState: ref({
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        invert: false,
      }),
      error: ref(null),
      isLoading: ref(false),
      selectFile: vi.fn(),
      cancelDecode: vi.fn(),
      rotateLeft: vi.fn(),
      rotateRight: vi.fn(),
      toggleHorizontal: vi.fn(),
      toggleVertical: vi.fn(),
      toggleInvert: vi.fn(),
      resetTransform: vi.fn(),
      reset: vi.fn(),
    }
    const openImportConfirmation = vi.fn(() => {
      if (canConfirmImport.value) isImportConfirmationOpen.value = true
    })
    const cancelImportConfirmation = vi.fn(() => {
      isImportConfirmationOpen.value = false
    })
    const confirmMapImport = vi.fn(async () => {
      if (isApplyingMap.value) return null
      isImportConfirmationOpen.value = false
      isApplyingMap.value = true
      try {
        return await harness.confirmMapImport()
      } finally {
        isApplyingMap.value = false
      }
    })
    harness.state = {
      step,
      analysisStatus,
      result,
      isApplyingMap,
      isImportConfirmationOpen,
      isMapPreviewStale,
      importApplicationError,
    }
    return {
      raster,
      step,
      canAnalyze: computed(() => !isApplyingMap.value),
      canSelectEntrances: computed(() => false),
      canApplyManualSelection: computed(() => false),
      isApplyingEntranceSelection: ref(false),
      needsLowConfidenceConfirmation: ref(false),
      isResultStale: ref(false),
      analysisBaseMapVersion: ref(2),
      analysisResultVersion: ref(1),
      isMapPreviewStale,
      canShowImportAction,
      canConfirmImport,
      isImportConfirmationOpen,
      isApplyingMap,
      importApplicationError,
      importApplicationWarnings: ref([]),
      importCapability: capability,
      importConfirmationSummary,
      analysisStatus,
      progress: shallowRef(null),
      result,
      analysisError: ref(null),
      manualSelection: ref({
        startCandidateId: null,
        goalCandidateId: null,
      }),
      manualSelectionValidation: computed(() => ({
        valid: false,
        sameCandidate: false,
        connected: false,
        pairExists: false,
        startCandidateExists: false,
        goalCandidateExists: false,
        warnings: [],
      })),
      entranceSelectionSource: ref('automatic'),
      appliedEntranceSelection: ref({
        startCandidateId: 'top:0-0',
        goalCandidateId: 'bottom:4-4',
      }),
      startAnalysis: vi.fn(),
      cancelAnalysis: vi.fn(),
      setManualEntrance: vi.fn(),
      clearManualEntranceSelection: vi.fn(),
      swapManualEntrances: vi.fn(),
      applyManualEntranceSelection: vi.fn(),
      confirmLowConfidenceSelection: vi.fn(),
      cancelLowConfidenceConfirmation: vi.fn(),
      swapAppliedEntrances: vi.fn(),
      openImportConfirmation,
      cancelImportConfirmation,
      confirmMapImport,
      returnToSource: vi.fn(),
      invalidateResult: vi.fn(),
      resetWizard: vi.fn(),
      disposeWizard: harness.disposeWizard,
    }
  },
}))

import MapImportModal from './MapImportModal.vue'

let app: ReturnType<typeof createApp> | null = null
let onClose: ReturnType<typeof vi.fn>
let onImageImported: ReturnType<typeof vi.fn>
let modalOpen = ref(true)

const state = () => harness.state as {
  step: ReturnType<typeof ref<'source' | 'analyzing' | 'result'>>
  analysisStatus: ReturnType<typeof ref<MazeImportAnalysisStatus>>
  result: ReturnType<typeof shallowRef<ReturnType<typeof successWorkerResult>>>
  isApplyingMap: ReturnType<typeof ref<boolean>>
  isImportConfirmationOpen: ReturnType<typeof ref<boolean>>
  isMapPreviewStale: ReturnType<typeof ref<boolean>>
  importApplicationError: ReturnType<typeof ref<{
    code: string
    message: string
  } | null>>
}

beforeEach(() => {
  setActivePinia(createPinia())
  harness.confirmMapImport.mockReset()
  harness.disposeWizard.mockReset()
  onClose = vi.fn()
  onImageImported = vi.fn()
  modalOpen.value = true
  const toast = useToast()
  for (const message of [...toast.messages.value]) toast.remove(message.id)
})

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const mountModal = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp({
    setup: () => () => h(MapImportModal, {
      open: modalOpen.value,
      onClose,
      onImageImported,
    }),
  })
  app.use(createPinia())
  app.mount(host)
  await nextTick()
  const imageTab = [...document.querySelectorAll<HTMLButtonElement>(
    '[role="tab"]',
  )].find((button) => button.textContent?.includes('图片迷宫'))
  imageTab?.click()
  await nextTick()
}

const button = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((item) => item.textContent?.trim() === text)

describe('MapImportModal 图片正式导入', () => {
  it('success 显示确认入口，其他分析状态不显示', async () => {
    await mountModal()
    expect(button('确认导入地图')?.disabled).toBe(false)

    for (const status of [
      'manual-input-required',
      'unsupported-topology',
      'failed',
      'cancelled',
      'running',
    ] as const) {
      state().analysisStatus.value = status
      state().step.value = status === 'running' ? 'analyzing' : 'result'
      await nextTick()
      expect(button('确认导入地图')).toBeUndefined()
    }
  })

  it('点击确认导入只打开二次确认，返回预览不会调用事务', async () => {
    await mountModal()
    button('确认导入地图')?.click()
    await nextTick()

    expect(document.body.textContent).toContain('即将替换当前地图')
    expect(document.body.textContent).toContain('41 × 41')
    expect(harness.confirmMapImport).not.toHaveBeenCalled()
    button('返回预览')?.click()
    await nextTick()
    expect(document.body.textContent).not.toContain('即将替换当前地图')
  })

  it('61×61 显示正式上限并禁用确认，不静默缩放', async () => {
    await mountModal()
    state().result.value = successWorkerResult(61)
    await nextTick()

    expect(document.body.textContent).toContain('转换地图：61 × 61')
    expect(document.body.textContent).toContain('正式导入上限为 60 × 60')
    expect(document.body.textContent).toContain(
      'MAP_IMPORT_RENDER_LIMIT_EXCEEDED',
    )
    expect(button('确认导入地图')?.disabled).toBe(true)
    expect(state().result.value?.document?.width).toBe(61)
  })

  it('成功才 Toast、清理、关闭并 emit imageImported', async () => {
    harness.confirmMapImport.mockResolvedValue(successTransaction())
    await mountModal()
    button('确认导入地图')?.click()
    await nextTick()
    button('确认替换地图')?.click()
    await nextTick()
    await nextTick()

    expect(harness.confirmMapImport).toHaveBeenCalledOnce()
    expect(harness.disposeWizard).toHaveBeenCalledOnce()
    expect(onImageImported).toHaveBeenCalledWith({
      width: 41,
      height: 41,
    })
    expect(onClose).toHaveBeenCalledOnce()
    expect(
      useToast().messages.value.some(
        (message) => message.text === '迷宫地图已导入',
      ),
    ).toBe(true)
  })

  it('失败保持弹窗和分析结果，不 emit 成功事件', async () => {
    harness.confirmMapImport.mockImplementation(async () => {
      state().importApplicationError.value = {
        code: 'MAP_IMPORT_TRANSACTION_ROLLED_BACK',
        message:
          '导入失败，原地图状态已经恢复。之前运行的路径规划任务已取消。',
      }
      return {
        ...successTransaction(),
        status: 'failed',
        applied: false,
        error: state().importApplicationError.value,
      }
    })
    await mountModal()
    button('确认导入地图')?.click()
    await nextTick()
    button('确认替换地图')?.click()
    await nextTick()
    await nextTick()

    expect(document.body.textContent).toContain(
      'MAP_IMPORT_TRANSACTION_ROLLED_BACK',
    )
    expect(state().result.value?.document?.width).toBe(41)
    expect(harness.disposeWizard).not.toHaveBeenCalled()
    expect(onImageImported).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applying 期间双击只调用一次，关闭、Escape 和切换类型均无效', async () => {
    let finish!: (result: MapImportTransactionResult) => void
    harness.confirmMapImport.mockImplementation(
      () => new Promise((resolve) => {
        finish = resolve
      }),
    )
    await mountModal()
    button('确认导入地图')?.click()
    await nextTick()
    const confirm = button('确认替换地图')
    confirm?.click()
    confirm?.click()
    await nextTick()

    expect(harness.confirmMapImport).toHaveBeenCalledOnce()
    expect(button('正在导入地图…')?.disabled).toBe(true)
    expect(
      document.querySelector<HTMLButtonElement>('[aria-label="关闭对话框"]')
        ?.disabled,
    ).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    modalOpen.value = false
    await nextTick()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    const jsonTab = [...document.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    )].find((tab) => tab.textContent?.includes('JSON 地图'))
    expect(jsonTab?.disabled).toBe(true)

    finish({
      ...successTransaction(),
      status: 'failed',
      applied: false,
      error: { code: 'FAILED', message: '失败' },
    })
    await nextTick()
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(button('确认导入地图')?.disabled).toBe(false)
  })

  it('stale 预览保留并禁用确认', async () => {
    await mountModal()
    state().isMapPreviewStale.value = true
    state().importApplicationError.value = {
      code: 'MAP_IMPORT_STALE_PREVIEW',
      message: '当前地图已发生变化，请重新识别后再导入。',
    }
    await nextTick()

    expect(document.body.textContent).toContain(
      '当前主地图已在迷宫识别期间发生变化',
    )
    expect(button('确认导入地图')?.disabled).toBe(true)
    expect(state().result.value?.document).not.toBeNull()
    expect(harness.confirmMapImport).not.toHaveBeenCalled()
  })
})
