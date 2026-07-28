import {
  computed,
  createApp,
  nextTick,
  ref,
  shallowRef,
} from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkerResultFixture,
  createWorkerResultWithEntrances,
} from '@/services/import/testUtils/mazeImportWorkerFixtures'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'

const harness = vi.hoisted(() => ({
  state: null as Record<string, unknown> | null,
  startAnalysis: vi.fn(),
  cancelAnalysis: vi.fn(),
  returnToSource: vi.fn(),
  setManualEntrance: vi.fn(),
  applyManualEntranceSelection: vi.fn(),
  disposeWizard: vi.fn(),
}))

vi.mock('@/composables/useMazeImportWizard', () => ({
  useMazeImportWizard: () => {
    const step = ref<'source' | 'analyzing' | 'result'>('source')
    const analysisStatus = ref<
      'idle' | 'running' | 'success' | 'manual-input-required'
    >('idle')
    const result = shallowRef<
      import('@/types/mazeImportWorker').MazeImportWorkerResult | null
    >(null)
    const progress = shallowRef(null)
    const analysisError = ref(null)
    const manualSelection = ref({
      startCandidateId: null as string | null,
      goalCandidateId: null as string | null,
    })
    const isApplyingEntranceSelection = ref(false)
    const needsLowConfidenceConfirmation = ref(false)
    const entranceSelectionSource = ref(null)
    const appliedEntranceSelection = ref(null)
    const canAnalyze = computed(() => analysisStatus.value !== 'running')
    const canSelectEntrances = computed(
      () => result.value?.entranceSelection?.status === 'ambiguous',
    )
    const manualSelectionValidation = computed(() => {
      const valid =
        manualSelection.value.startCandidateId !== null &&
        manualSelection.value.goalCandidateId !== null
      return {
        valid,
        sameCandidate: false,
        connected: valid,
        pairExists: valid,
        startCandidateExists:
          manualSelection.value.startCandidateId !== null,
        goalCandidateExists:
          manualSelection.value.goalCandidateId !== null,
        warnings: valid ? [] : ['请选择起点入口。'],
      }
    })
    const canApplyManualSelection = computed(
      () => canSelectEntrances.value && manualSelectionValidation.value.valid,
    )
    const raster = {
      selectedFile: shallowRef(new File(
        ['maze'],
        'maze.png',
        { type: 'image/png' },
      )),
      decodedImage: shallowRef({
        matrix: {
          width: 1,
          height: 1,
          rgba: new Uint8ClampedArray([255, 255, 255, 255]),
        },
        metadata: {
          width: 1,
          height: 1,
          pixels: 1,
          mimeType: 'image/png',
          fileSize: 4,
          fileName: 'maze.png',
        },
      }),
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
      selectFile: vi.fn(async () => true),
      cancelDecode: vi.fn(),
      rotateLeft: vi.fn(),
      rotateRight: vi.fn(),
      toggleHorizontal: vi.fn(),
      toggleVertical: vi.fn(),
      toggleInvert: vi.fn(),
      resetTransform: vi.fn(),
      reset: vi.fn(),
    }
    harness.startAnalysis.mockImplementation(async () => {
      if (analysisStatus.value === 'running') return
      step.value = 'analyzing'
      analysisStatus.value = 'running'
    })
    harness.cancelAnalysis.mockImplementation(() => {
      step.value = 'source'
      analysisStatus.value = 'idle'
    })
    harness.returnToSource.mockImplementation(() => {
      step.value = 'source'
      analysisStatus.value = 'idle'
      result.value = null
    })
    harness.setManualEntrance.mockImplementation((
      role: 'start' | 'goal',
      candidateId: string,
    ) => {
      manualSelection.value = {
        ...manualSelection.value,
        [role === 'start' ? 'startCandidateId' : 'goalCandidateId']:
          candidateId,
      }
    })
    harness.state = {
      step,
      analysisStatus,
      result,
      progress,
      analysisError,
      manualSelection,
    }
    return {
      raster,
      step,
      canAnalyze,
      isResultStale: ref(false),
      canSelectEntrances,
      canApplyManualSelection,
      isApplyingEntranceSelection,
      needsLowConfidenceConfirmation,
      analysisStatus,
      progress,
      result,
      analysisError,
      manualSelection,
      manualSelectionValidation,
      entranceSelectionSource,
      appliedEntranceSelection,
      startAnalysis: harness.startAnalysis,
      cancelAnalysis: harness.cancelAnalysis,
      setManualEntrance: harness.setManualEntrance,
      clearManualEntranceSelection: vi.fn(() => {
        manualSelection.value = {
          startCandidateId: null,
          goalCandidateId: null,
        }
      }),
      swapManualEntrances: vi.fn(),
      applyManualEntranceSelection: harness.applyManualEntranceSelection,
      confirmLowConfidenceSelection: vi.fn(),
      cancelLowConfidenceConfirmation: vi.fn(),
      swapAppliedEntrances: vi.fn(),
      returnToSource: harness.returnToSource,
      invalidateResult: vi.fn(),
      resetWizard: vi.fn(),
      disposeWizard: harness.disposeWizard,
    }
  },
}))

import MapImportModal from './MapImportModal.vue'

let app: ReturnType<typeof createApp> | null = null
let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  harness.startAnalysis.mockReset()
  harness.cancelAnalysis.mockReset()
  harness.returnToSource.mockReset()
  harness.setManualEntrance.mockReset()
  harness.applyManualEntranceSelection.mockReset()
  harness.disposeWizard.mockReset()
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const mountModal = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(MapImportModal, { open: true })
  app.use(pinia)
  app.mount(host)
  await nextTick()
  return host
}

const openImageTab = async () => {
  const tab = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((button) => button.textContent?.includes('图片迷宫'))
  tab?.click()
  await nextTick()
}

describe('MapImportModal 迷宫分析接入', () => {
  it('保留 JSON 导入入口，图片按钮启用且点击只提交一次', async () => {
    await mountModal()
    expect(document.body.textContent).toContain('JSON 地图')
    expect(document.body.textContent).toContain('moon-pathplanning.grid.v1')
    await openImageTab()
    const analyze = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === '识别迷宫')
    expect(analyze?.disabled).toBe(false)
    analyze?.click()
    await nextTick()
    expect(harness.startAnalysis).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('取消识别')
    expect(document.body.textContent).not.toContain('确认导入')
  })

  it('手动选择入口只更新 Wizard UI，不调用 JSON 导入或修改 Grid/Planner', async () => {
    await mountModal()
    const grid = useGridStore()
    const planner = usePlannerStore()
    const beforeGrid = JSON.stringify(grid.$state)
    const beforePlanner = JSON.stringify(planner.$state)
    await openImageTab()
    const state = harness.state as {
      step: ReturnType<typeof ref<'source' | 'analyzing' | 'result'>>
      analysisStatus: ReturnType<typeof ref<string>>
      result: ReturnType<typeof shallowRef>
    }
    state.step.value = 'result'
    state.analysisStatus.value = 'manual-input-required'
    state.result.value = createWorkerResultWithEntrances(
      'manual-input-required',
      'ambiguous',
    )
    await nextTick()
    expect(document.body.textContent).toContain('需要确认迷宫入口')
    expect(document.body.textContent).toContain('选择起点与终点')
    const start = document.querySelector<HTMLInputElement>(
      'input[aria-label="将 top:0-0 设为起点"]',
    )
    const goal = document.querySelector<HTMLInputElement>(
      'input[aria-label="将 bottom:4-4 设为终点"]',
    )
    start?.click()
    goal?.click()
    await nextTick()
    const apply = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === '应用入口选择')
    expect(apply?.disabled).toBe(false)
    apply?.click()
    expect(harness.applyManualEntranceSelection).toHaveBeenCalledOnce()
    expect(JSON.stringify(grid.$state)).toBe(beforeGrid)
    expect(JSON.stringify(planner.$state)).toBe(beforePlanner)
  })

  it('关闭弹窗释放 Wizard，但不修改地图、Path 或 Trace', async () => {
    await mountModal()
    const grid = useGridStore()
    const planner = usePlannerStore()
    const beforeGrid = JSON.stringify(grid.$state)
    const beforePlanner = JSON.stringify(planner.$state)
    await openImageTab()
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === '取消')
    cancel?.click()
    await nextTick()
    expect(harness.disposeWizard).toHaveBeenCalledOnce()
    expect(JSON.stringify(grid.$state)).toBe(beforeGrid)
    expect(JSON.stringify(planner.$state)).toBe(beforePlanner)
  })
})
