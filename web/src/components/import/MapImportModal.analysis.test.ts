import {
  computed,
  createApp,
  nextTick,
  ref,
  shallowRef,
} from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkerResultFixture } from '@/services/import/testUtils/mazeImportWorkerFixtures'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'

const harness = vi.hoisted(() => ({
  state: null as Record<string, unknown> | null,
  startAnalysis: vi.fn(),
  cancelAnalysis: vi.fn(),
  returnToSource: vi.fn(),
  disposeWizard: vi.fn(),
}))

vi.mock('@/composables/useMazeImportWizard', () => ({
  useMazeImportWizard: () => {
    const step = ref<'source' | 'analyzing' | 'result'>('source')
    const analysisStatus = ref<
      'idle' | 'running' | 'success' | 'manual-input-required'
    >('idle')
    const result = shallowRef(null)
    const progress = shallowRef(null)
    const analysisError = ref(null)
    const canAnalyze = computed(() => analysisStatus.value !== 'running')
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
    harness.state = {
      step,
      analysisStatus,
      result,
      progress,
      analysisError,
    }
    return {
      raster,
      step,
      canAnalyze,
      isResultStale: ref(false),
      analysisStatus,
      progress,
      result,
      analysisError,
      startAnalysis: harness.startAnalysis,
      cancelAnalysis: harness.cancelAnalysis,
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

  it('显示只读 manual 结果，不调用 JSON 导入或修改 Grid/Planner', async () => {
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
    state.result.value = createWorkerResultFixture('manual-input-required')
    await nextTick()
    expect(document.body.textContent).toContain('需要确认迷宫入口')
    expect(document.body.textContent).toContain(
      '入口手动选择将在下一阶段开放',
    )
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
