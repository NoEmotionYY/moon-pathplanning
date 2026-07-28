import {
  ref,
  shallowRef,
  type Ref,
  type ShallowRef,
} from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  DecodedImage,
  ImageMatrix,
  ImageTransformState,
  MazeImportError,
  MazeSourceFileType,
} from '@/types/import'
import type {
  MazeImportPipelineProgress,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerAnalyzeOptions,
} from '@/services/import/mazeImportWorkerClient'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import type { MazeImportWorkerError } from '@/services/import/mazeImportWorkerError'
import {
  createProgressFixture,
  createWorkerResultFixture,
  createWorkerResultWithEntrances,
} from '@/services/import/testUtils/mazeImportWorkerFixtures'
import type {
  MazeImportAnalysisStatus,
  UseMazeImportAnalysis,
} from './useMazeImportAnalysis'
import {
  useMazeImportWizard,
  type RasterImageImport,
} from './useMazeImportWizard'

const source: ImageMatrix = {
  width: 8,
  height: 10,
  rgba: new Uint8ClampedArray(8 * 10 * 4),
}

const decoded: DecodedImage = {
  matrix: source,
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
  const transformedImage = shallowRef<ImageMatrix | null>({
    width: 10,
    height: 8,
    rgba: new Uint8ClampedArray(8 * 10 * 4),
  })
  const fileType = ref<MazeSourceFileType>('png')
  const transformState = ref<ImageTransformState>({
    rotation: 90,
    flipHorizontal: false,
    flipVertical: false,
    invert: false,
  })
  const error = ref<MazeImportError | null>(null)
  const isLoading = ref(false)
  const reset = vi.fn(() => {
    selectedFile.value = null
    decodedImage.value = null
    transformedImage.value = null
    fileType.value = 'unsupported'
    transformState.value = {
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      invert: false,
    }
    error.value = null
  })
  const update = (next: Partial<ImageTransformState>) => {
    transformState.value = { ...transformState.value, ...next }
  }
  return {
    selectedFile,
    decodedImage,
    transformedImage,
    fileType,
    transformState,
    error,
    isLoading,
    selectFile: vi.fn(async () => true),
    cancelDecode: vi.fn(),
    rotateLeft: vi.fn(() => update({ rotation: 0 })),
    rotateRight: vi.fn(() => update({ rotation: 180 })),
    toggleHorizontal: vi.fn(() => update({
      flipHorizontal: !transformState.value.flipHorizontal,
    })),
    toggleVertical: vi.fn(() => update({
      flipVertical: !transformState.value.flipVertical,
    })),
    toggleInvert: vi.fn(() => update({
      invert: !transformState.value.invert,
    })),
    resetTransform: vi.fn(() => update({
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      invert: false,
    })),
    reset,
  }
}

interface FakeAnalysis extends UseMazeImportAnalysis {
  status: Ref<MazeImportAnalysisStatus>
  progress: Ref<MazeImportPipelineProgress | null>
  result: ShallowRef<MazeImportWorkerResult | null>
  error: Ref<MazeImportWorkerError | null>
  analyze: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const createAnalysis = (
  outcome = createWorkerResultFixture('success'),
): FakeAnalysis => {
  const status = ref<MazeImportAnalysisStatus>('idle')
  const progress = ref<MazeImportPipelineProgress | null>(null)
  const result = shallowRef(null)
  const error = ref(null)
  const analyze = vi.fn(async (
    _image: ImageMatrix,
    options?: MazeImportWorkerAnalyzeOptions,
  ) => {
    status.value = 'running'
    options?.onProgress?.(createProgressFixture(0.45))
    status.value = outcome.status
    return outcome
  })
  return {
    status,
    progress,
    result,
    error,
    analyze,
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

describe('useMazeImportWizard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('Worker 分析服务在首次识别前保持惰性', async () => {
    const factory = vi.fn(() => createAnalysis())
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: factory,
    })
    expect(factory).not.toHaveBeenCalled()
    expect(wizard.canAnalyze.value).toBe(true)
    await wizard.startAnalysis()
    expect(factory).toHaveBeenCalledOnce()
  })

  it('发送原始矩阵、不可变变换快照和 preview 详情', async () => {
    const analysis = createAnalysis()
    const raster = createRaster()
    raster.transformState.value = {
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
      invert: true,
    }
    const wizard = useMazeImportWizard({
      raster,
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    expect(analysis.analyze).toHaveBeenCalledOnce()
    const [sentImage, options] = analysis.analyze.mock.calls[0]!
    expect(sentImage).toBe(source)
    expect(sentImage).not.toBe(raster.transformedImage.value)
    expect(options).toMatchObject({
      pipeline: {
        transform: {
          rotation: 90,
          flipHorizontal: true,
          flipVertical: false,
          invert: true,
        },
      },
      resultDetail: 'preview',
    })
    expect(Object.isFrozen(options.pipeline.transform)).toBe(true)
  })

  it('90° 旋转、水平翻转和反色都只作为一次 Worker 变换传递', async () => {
    const analysis = createAnalysis()
    const raster = createRaster()
    const wizard = useMazeImportWizard({
      raster,
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    const [sentImage, options] = analysis.analyze.mock.calls[0]!
    expect(sentImage).toMatchObject({ width: 8, height: 10 })
    expect(options.pipeline.transform.rotation).toBe(90)
    expect(options.pipeline.transform.flipHorizontal).toBe(false)
    expect(options.pipeline.transform.invert).toBe(false)
    expect(raster.transformedImage.value).toMatchObject({
      width: 10,
      height: 8,
    })
  })

  it('分析期间阻止重复提交并显示真实单调进度', async () => {
    let resolveAnalysis!: (
      value: ReturnType<typeof createWorkerResultFixture>,
    ) => void
    const analysis = createAnalysis()
    analysis.analyze = vi.fn((
      _image: ImageMatrix,
      options?: MazeImportWorkerAnalyzeOptions,
    ) => {
      analysis.status.value = 'running'
      options?.onProgress?.(createProgressFixture(0.6))
      options?.onProgress?.(createProgressFixture(0.3))
      return new Promise((resolve) => {
        resolveAnalysis = resolve
      })
    })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    const first = wizard.startAnalysis()
    await wizard.startAnalysis()
    expect(analysis.analyze).toHaveBeenCalledOnce()
    expect(wizard.progress.value?.progress).toBe(0.6)
    const outcome = createWorkerResultFixture('success')
    analysis.status.value = 'success'
    resolveAnalysis(outcome)
    await first
  })

  it('成功、手动处理和不支持拓扑结果进入 result 步骤', async () => {
    for (const status of [
      'success',
      'manual-input-required',
      'unsupported-topology',
    ] as const) {
      const wizard = useMazeImportWizard({
        raster: createRaster(),
        analysisFactory: () =>
          createAnalysis(createWorkerResultFixture(status)),
      })
      await wizard.startAnalysis()
      expect(wizard.step.value).toBe('result')
      expect(wizard.analysisStatus.value).toBe(status)
    }
  })

  it('变换和替换图片会清除旧结果', async () => {
    const raster = createRaster()
    const analysis = createAnalysis()
    const wizard = useMazeImportWizard({
      raster,
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    expect(wizard.result.value).not.toBeNull()
    raster.toggleHorizontal()
    expect(wizard.step.value).toBe('source')
    expect(wizard.result.value).toBeNull()
    expect(wizard.progress.value).toBeNull()
    expect(wizard.isResultStale.value).toBe(true)

    await wizard.startAnalysis()
    raster.selectedFile.value = new File(
      ['next'],
      'next.png',
      { type: 'image/png' },
    )
    expect(wizard.result.value).toBeNull()
  })

  it('硬取消后移除旧结果，并可重新识别', async () => {
    const analysis = createAnalysis()
    analysis.analyze = vi.fn(() => {
      analysis.status.value = 'running'
      return new Promise(() => undefined)
    })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    void wizard.startAnalysis()
    wizard.cancelAnalysis()
    expect(analysis.cancel).toHaveBeenCalledOnce()
    expect(wizard.step.value).toBe('source')
    expect(wizard.analysisStatus.value).toBe('cancelled')
    expect(wizard.result.value).toBeNull()
    expect(wizard.canAnalyze.value).toBe(true)
  })

  it('关闭释放客户端和图片，再次识别会创建新客户端', async () => {
    const first = createAnalysis()
    const second = createAnalysis()
    const factory = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const raster = createRaster()
    const wizard = useMazeImportWizard({
      raster,
      analysisFactory: factory,
    })
    await wizard.startAnalysis()
    wizard.disposeWizard()
    expect(first.dispose).toHaveBeenCalledOnce()
    expect(raster.reset).toHaveBeenCalled()

    raster.selectedFile.value = new File(
      ['maze'],
      'maze.png',
      { type: 'image/png' },
    )
    raster.decodedImage.value = decoded
    raster.fileType.value = 'png'
    await wizard.startAnalysis()
    expect(factory).toHaveBeenCalledTimes(2)
    expect(second.analyze).toHaveBeenCalledOnce()
  })

  it('明确选择起点终点后用同一原图和变换快照重新调用 Worker', async () => {
    const manual = createWorkerResultWithEntrances(
      'manual-input-required',
      'ambiguous',
    )
    const success = createWorkerResultWithEntrances('success', 'selected')
    const analysis = createAnalysis(manual)
    let call = 0
    analysis.analyze.mockImplementation(async (
      _image: ImageMatrix,
      options?: MazeImportWorkerAnalyzeOptions,
    ) => {
      const outcome = call === 0 ? manual : success
      call += 1
      analysis.status.value = outcome.status
      options?.onProgress?.(createProgressFixture(0.5))
      return outcome
    })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    expect(wizard.canApplyManualSelection.value).toBe(true)
    await wizard.applyManualEntranceSelection()

    expect(analysis.analyze).toHaveBeenCalledTimes(2)
    const [sentImage, options] = analysis.analyze.mock.calls[1]!
    expect(sentImage).toBe(source)
    expect(options).toMatchObject({
      pipeline: {
        transform: {
          rotation: 90,
          flipHorizontal: false,
          flipVertical: false,
          invert: false,
        },
        manualEntrancePair: {
          firstCandidateId: 'top:0-0',
          secondCandidateId: 'bottom:4-4',
        },
        gridConversion: {
          allowLowConfidenceManualPair: false,
        },
      },
      resultDetail: 'preview',
    })
    expect(wizard.analysisStatus.value).toBe('success')
    expect(wizard.canSelectEntrances.value).toBe(false)
    expect(wizard.entranceSelectionSource.value).toBe('manual')
    expect(wizard.appliedEntranceSelection.value).toEqual({
      startCandidateId: 'top:0-0',
      goalCandidateId: 'bottom:4-4',
    })
  })

  it('同一候选切换角色会清除另一角色，断开候选对不能应用', async () => {
    const manual = createWorkerResultWithEntrances(
      'manual-input-required',
      'disconnected',
    )
    const summary = manual.entranceSelection!
    summary.candidates[1] = {
      ...summary.candidates[1]!,
      componentId: 2,
    }
    summary.pairCandidates[0] = {
      ...summary.pairCandidates[0]!,
      connected: false,
      sameComponent: false,
    }
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => createAnalysis(manual),
    })
    await wizard.startAnalysis()
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'top:0-0')
    expect(wizard.manualSelection.value).toEqual({
      startCandidateId: null,
      goalCandidateId: 'top:0-0',
    })
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    expect(wizard.canApplyManualSelection.value).toBe(false)
    expect(wizard.manualSelectionValidation.value.connected).toBe(false)
  })

  it('低置信度入口先显示行内确认，确认后才允许 Worker 转换', async () => {
    const manual = createWorkerResultWithEntrances(
      'manual-input-required',
      'low-confidence',
    )
    const success = createWorkerResultWithEntrances('success', 'selected')
    const analysis = createAnalysis(manual)
    analysis.analyze
      .mockImplementationOnce(async () => {
        analysis.status.value = manual.status
        return manual
      })
      .mockImplementationOnce(async () => {
        analysis.status.value = success.status
        return success
      })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    await wizard.applyManualEntranceSelection()
    expect(wizard.needsLowConfidenceConfirmation.value).toBe(true)
    expect(analysis.analyze).toHaveBeenCalledOnce()

    await wizard.confirmLowConfidenceSelection()
    expect(analysis.analyze).toHaveBeenCalledTimes(2)
    expect(analysis.analyze.mock.calls[1]?.[1]).toMatchObject({
      pipeline: {
        gridConversion: {
          allowLowConfidenceManualPair: true,
        },
      },
    })
  })

  it('取消应用入口时恢复原候选结果并保留用户选择', async () => {
    const manual = createWorkerResultWithEntrances()
    const analysis = createAnalysis(manual)
    analysis.analyze
      .mockImplementationOnce(async () => {
        analysis.status.value = manual.status
        return manual
      })
      .mockImplementationOnce(() => {
        analysis.status.value = 'running'
        return new Promise(() => undefined)
      })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    void wizard.applyManualEntranceSelection()
    expect(wizard.isApplyingEntranceSelection.value).toBe(true)
    wizard.cancelAnalysis()
    expect(wizard.step.value).toBe('result')
    expect(wizard.result.value).toBe(manual)
    expect(wizard.analysisStatus.value).toBe('manual-input-required')
    expect(wizard.manualSelection.value).toEqual({
      startCandidateId: 'top:0-0',
      goalCandidateId: 'bottom:4-4',
    })
  })

  it('自动成功结果可交换起终点并通过 Worker 重新生成预览', async () => {
    const automatic = createWorkerResultWithEntrances(
      'success',
      'selected',
    )
    const swapped = createWorkerResultWithEntrances('success', 'selected')
    const analysis = createAnalysis(automatic)
    analysis.analyze
      .mockImplementationOnce(async () => {
        analysis.status.value = automatic.status
        return automatic
      })
      .mockImplementationOnce(async () => {
        analysis.status.value = swapped.status
        return swapped
      })
    const wizard = useMazeImportWizard({
      raster: createRaster(),
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    expect(wizard.entranceSelectionSource.value).toBe('automatic')
    await wizard.swapAppliedEntrances()
    expect(analysis.analyze.mock.calls[1]?.[1]).toMatchObject({
      pipeline: {
        manualEntrancePair: {
          firstCandidateId: 'bottom:4-4',
          secondCandidateId: 'top:0-0',
        },
      },
    })
    expect(wizard.entranceSelectionSource.value).toBe('manual')
    expect(wizard.appliedEntranceSelection.value).toEqual({
      startCandidateId: 'bottom:4-4',
      goalCandidateId: 'top:0-0',
    })
  })

  it('图片改变会清空选择，旧的应用请求即使返回也不能覆盖新状态', async () => {
    const manual = createWorkerResultWithEntrances()
    const success = createWorkerResultWithEntrances('success', 'selected')
    const analysis = createAnalysis(manual)
    let resolveApply!: (value: MazeImportWorkerResult) => void
    analysis.analyze
      .mockImplementationOnce(async () => {
        analysis.status.value = manual.status
        return manual
      })
      .mockImplementationOnce(() => {
        analysis.status.value = 'running'
        return new Promise((resolve) => {
          resolveApply = resolve
        })
      })
    const raster = createRaster()
    const wizard = useMazeImportWizard({
      raster,
      analysisFactory: () => analysis,
    })
    await wizard.startAnalysis()
    wizard.setManualEntrance('start', 'top:0-0')
    wizard.setManualEntrance('goal', 'bottom:4-4')
    const applying = wizard.applyManualEntranceSelection()
    raster.selectedFile.value = new File(
      ['new'],
      'new.png',
      { type: 'image/png' },
    )
    resolveApply(success)
    await applying
    expect(wizard.step.value).toBe('source')
    expect(wizard.result.value).toBeNull()
    expect(wizard.manualSelection.value).toEqual({
      startCandidateId: null,
      goalCandidateId: null,
    })
  })
})
