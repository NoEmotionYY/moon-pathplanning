import { createApp, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MazeImportWorkerPreviewResult } from '@/types/mazeImportWorker'

const rendererSpies = vi.hoisted(() => ({
  detection: vi.fn(),
  grid: vi.fn(),
}))

vi.mock('@/services/import/mazeDetectionPreviewRenderer', () => ({
  renderMazeDetectionPreview: rendererSpies.detection,
}))
vi.mock('@/services/import/gridDocumentPreviewRenderer', () => ({
  renderGridDocumentPreview: rendererSpies.grid,
}))

import MazeDetectionPreview from './MazeDetectionPreview.vue'

const result: MazeImportWorkerPreviewResult = {
  detail: 'preview',
  status: 'success',
  completedStage: 'completed',
  diagnostics: {
    sourceWidth: 80,
    sourceHeight: 100,
    transformedWidth: 100,
    transformedHeight: 80,
    croppedWidth: 98,
    croppedHeight: 78,
    detectedRows: 8,
    detectedColumns: 10,
    orthogonalConfidence: 0.92,
    topologyConfidence: 0.88,
    entranceStatus: 'selected',
    entranceCandidateCount: 2,
    pairCandidateCount: 1,
    convertedWidth: 21,
    convertedHeight: 17,
    obstacleCount: 196,
    walkableCount: 161,
  },
  document: {
    format: 'moon-pathplanning.grid.v1',
    width: 21,
    height: 17,
    start: [1, 0],
    goal: [19, 16],
    movement: 'four_way',
    obstacles: [[0, 0]],
    terrain: [],
  },
  detection: null,
  topology: null,
  entranceSelection: {
    status: 'selected',
    automatic: true,
    confidence: 0.9,
    candidateCount: 2,
    pairCandidateCount: 1,
    selectedCandidateIds: ['top:0-0', 'bottom:9-9'],
    candidates: [],
    warnings: [],
  },
  conversion: null,
  warnings: [],
  error: null,
  timings: [],
  totalDurationMs: 12,
  preview: {
    croppedMask: {
      width: 3,
      height: 3,
      values: new Uint8Array([
        1, 1, 1,
        1, 0, 1,
        1, 1, 1,
      ]),
    },
    horizontalLineCenters: [0, 2],
    verticalLineCenters: [0, 2],
    horizontalBoundaries: [],
    verticalBoundaries: [],
    outerBoundaries: [],
    entranceCandidates: [],
  },
}

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = []
  readonly observe = vi.fn()
  readonly disconnect = vi.fn()
  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this)
  }
}

let app: ReturnType<typeof createApp> | null = null

beforeEach(() => {
  rendererSpies.detection.mockClear()
  rendererSpies.grid.mockClear()
  ResizeObserverStub.instances = []
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

const mountPreview = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(MazeDetectionPreview, {
    result,
    theme: 'dark',
  })
  app.mount(host)
  await nextTick()
  await nextTick()
  return host
}

describe('MazeDetectionPreview', () => {
  it('结构预览调用纯 renderer，并使用单个 Canvas', async () => {
    const host = await mountPreview()
    expect(rendererSpies.detection).toHaveBeenCalled()
    expect(host.querySelectorAll('canvas')).toHaveLength(1)
    expect(host.querySelectorAll('[data-grid-cell]')).toHaveLength(0)
  })

  it('切换转换地图调用地图 renderer', async () => {
    const host = await mountPreview()
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[1]?.click()
    await nextTick()
    await nextTick()
    expect(rendererSpies.grid).toHaveBeenCalled()
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
  })

  it('ResizeObserver 回调触发重绘并在卸载时断开', async () => {
    await mountPreview()
    const observer = ResizeObserverStub.instances[0]
    expect(observer?.observe).toHaveBeenCalledOnce()
    rendererSpies.detection.mockClear()
    observer?.callback([], observer as unknown as ResizeObserver)
    await nextTick()
    expect(rendererSpies.detection).toHaveBeenCalled()
    app?.unmount()
    app = null
    expect(observer?.disconnect).toHaveBeenCalledOnce()
  })
})
