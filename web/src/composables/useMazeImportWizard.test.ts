import {
  ref,
  shallowRef,
  type Ref,
  type ShallowRef,
} from 'vue'
import { describe, expect, it, vi } from 'vitest'
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
})
