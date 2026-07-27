import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import type { GridMapDocument } from '@/types/grid'
import type { MazePreprocessResult } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import type { EntranceSelectionResult } from '@/types/mazeEntrances'
import type {
  MazeImportPipelineError,
  MazeImportPipelineOptionOverrides,
  MazeImportPipelineOptions,
  MazeImportPipelineProgress,
  MazeImportPipelineResult,
  MazeImportPipelineStage,
  MazeImportPipelineStatus,
  MazeImportProgressCallback,
} from '@/types/mazeImportPipeline'
import type { OrthogonalMazeTopology } from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import type { OrthogonalGridConversionResult } from '@/types/orthogonalGridConversion'
import { validateGridDocument } from '@/utils/validation'
import { selectEntrancePair } from './entranceSelection'
import { assertImageMatrix } from './imageDataValidation'
import { applyImageTransforms } from './imageTransform'
import {
  createCancelledPipelineError,
  normalizePipelineError,
} from './mazeImportPipelineError'
import { resolveMazeImportPipelineOptions } from './mazeImportPipelineDefaults'
import { preprocessMazeImage } from './mazePreprocessor'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { convertOrthogonalMazeToGridDocument } from './orthogonalMazeToGridDocument'
import { analyzeOrthogonalTopology } from './orthogonalTopologyAnalyzer'
import { createPipelineDiagnostics } from './pipelineDiagnostics'
import { createPipelineTimer } from './pipelineTiming'
import {
  collectPipelineWarnings,
  type PipelineWarningSource,
} from './pipelineWarnings'

const PROCESSING_STAGES: readonly MazeImportPipelineStage[] = [
  'validation',
  'transform',
  'preprocess',
  'orthogonal-detection',
  'topology-analysis',
  'entrance-selection',
  'grid-conversion',
  'document-validation',
  'completed',
]

const STAGE_MESSAGES: Readonly<Record<MazeImportPipelineStage, string>> = {
  validation: '校验图片矩阵',
  transform: '应用图片变换',
  preprocess: '预处理迷宫图片',
  'orthogonal-detection': '检测正交迷宫结构',
  'topology-analysis': '分析迷宫拓扑',
  'entrance-selection': '选择入口候选',
  'grid-conversion': '转换网格地图',
  'document-validation': '校验地图文档',
  completed: '分析完成',
}

interface PipelineState {
  transformedImage: ImageMatrix | null
  preprocess: MazePreprocessResult | null
  orthogonalDetection: OrthogonalMazeDetection | null
  topology: OrthogonalMazeTopology | null
  entranceSelection: EntranceSelectionResult | null
  conversion: OrthogonalGridConversionResult | null
}

const createInitialState = (): PipelineState => ({
  transformedImage: null,
  preprocess: null,
  orthogonalDetection: null,
  topology: null,
  entranceSelection: null,
  conversion: null,
})

export async function analyzeRasterMaze(
  sourceImage: ImageMatrix,
  options: MazeImportPipelineOptionOverrides = {},
  signal?: AbortSignal,
  onProgress?: MazeImportProgressCallback,
): Promise<MazeImportPipelineResult> {
  const timer = createPipelineTimer()
  const state = createInitialState()
  const warningSources: PipelineWarningSource[] = []
  let completedStage: MazeImportPipelineStage = 'validation'
  let resolvedOptions: MazeImportPipelineOptions | null = null

  const report = (
    stage: MazeImportPipelineStage,
    completed: boolean,
  ): void => {
    if (!onProgress) {
      return
    }
    const stageIndex = PROCESSING_STAGES.indexOf(stage)
    const totalStages = PROCESSING_STAGES.length
    const progress = stage === 'completed'
      ? 1
      : (stageIndex + (completed ? 1 : 0)) / totalStages
    const update: MazeImportPipelineProgress = {
      stage,
      stageIndex,
      totalStages,
      progress: Math.max(0, Math.min(1, progress)),
      message: `${STAGE_MESSAGES[stage]}${completed ? '完成' : '开始'}`,
    }
    try {
      onProgress(update)
    } catch {
      warningSources.push({
        stage,
        warnings: ['IMPORT_PROGRESS_CALLBACK_FAILED'],
      })
    }
  }

  const buildResult = (
    status: MazeImportPipelineStatus,
    error: MazeImportPipelineError | null,
    document: GridMapDocument | null = null,
  ): MazeImportPipelineResult => {
    const timing = timer.finish()
    return {
      status,
      completedStage,
      sourceImage,
      ...state,
      document,
      warnings: collectPipelineWarnings(...warningSources),
      error,
      timings: timing.timings,
      totalDurationMs: timing.totalDurationMs,
      diagnostics: createPipelineDiagnostics(sourceImage, state),
    }
  }

  const cancelledBefore = (
    stage: MazeImportPipelineStage,
  ): MazeImportPipelineResult | null => {
    if (!signal?.aborted) {
      return null
    }
    return buildResult(
      'cancelled',
      createCancelledPipelineError(stage),
    )
  }

  const runStage = <T>(
    stage: MazeImportPipelineStage,
    operation: () => T,
  ): T => {
    completedStage = stage
    report(stage, false)
    try {
      return timer.measure(stage, operation)
    } finally {
      report(stage, true)
    }
  }

  try {
    const cancelled = cancelledBefore('validation')
    if (cancelled) {
      return cancelled
    }
    runStage('validation', () => {
      assertImageMatrix(sourceImage)
      resolvedOptions = resolveMazeImportPipelineOptions(options)
    })
    completedStage = 'validation'

    {
      const stopped = cancelledBefore('transform')
      if (stopped) return stopped
    }
    state.transformedImage = runStage('transform', () => {
      // 变换服务始终创建新的 RGBA 数组；sourceImage 保持原引用且不被修改。
      return applyImageTransforms(
        sourceImage,
        resolvedOptions!.transform,
      )
    })
    completedStage = 'transform'

    {
      const stopped = cancelledBefore('preprocess')
      if (stopped) return stopped
    }
    state.preprocess = runStage('preprocess', () =>
      preprocessMazeImage(
        state.transformedImage!,
        resolvedOptions!.preprocess,
      ))
    warningSources.push({
      stage: 'preprocess',
      warnings: state.preprocess.warnings,
    })
    completedStage = 'preprocess'

    {
      const stopped = cancelledBefore('orthogonal-detection')
      if (stopped) return stopped
    }
    state.orthogonalDetection = runStage(
      'orthogonal-detection',
      () => detectOrthogonalMaze(
        state.preprocess!.croppedMask,
        state.preprocess!.integralMask,
        resolvedOptions!.orthogonalDetection,
      ),
    )
    warningSources.push({
      stage: 'orthogonal-detection',
      warnings: state.orthogonalDetection.warnings,
    })
    completedStage = 'orthogonal-detection'
    if (!state.orthogonalDetection.detected) {
      return buildResult('unsupported-topology', null)
    }

    {
      const stopped = cancelledBefore('topology-analysis')
      if (stopped) return stopped
    }
    state.topology = runStage('topology-analysis', () =>
      analyzeOrthogonalTopology(
        state.preprocess!.croppedMask,
        state.preprocess!.integralMask,
        state.orthogonalDetection!,
        resolvedOptions!.topologyDetection,
      ))
    warningSources.push({
      stage: 'topology-analysis',
      warnings: state.topology.warnings,
    })
    completedStage = 'topology-analysis'

    {
      const stopped = cancelledBefore('entrance-selection')
      if (stopped) return stopped
    }
    state.entranceSelection = runStage('entrance-selection', () =>
      selectEntrancePair(
        state.topology!,
        state.orthogonalDetection!,
        resolvedOptions!.entranceDetection,
      ))
    warningSources.push({
      stage: 'entrance-selection',
      warnings: state.entranceSelection.warnings,
    })
    completedStage = 'entrance-selection'

    const mayConvert =
      state.entranceSelection.status === 'selected' ||
      resolvedOptions!.manualEntrancePair !== undefined
    if (!mayConvert) {
      if (state.entranceSelection.status === 'topology-unavailable') {
        return buildResult(
          'failed',
          normalizePipelineError(
            new Error('正交拓扑不可用于入口分析。'),
            'entrance-selection',
          ),
        )
      }
      return buildResult('manual-input-required', null)
    }

    {
      const stopped = cancelledBefore('grid-conversion')
      if (stopped) return stopped
    }
    state.conversion = runStage('grid-conversion', () =>
      convertOrthogonalMazeToGridDocument({
        detection: state.orthogonalDetection!,
        topology: state.topology!,
        entranceSelection: state.entranceSelection!,
        ...(resolvedOptions!.manualEntrancePair
          ? { manualPair: resolvedOptions!.manualEntrancePair }
          : {}),
        options: resolvedOptions!.gridConversion,
      }))
    warningSources.push({
      stage: 'grid-conversion',
      warnings: state.conversion.warnings,
    })
    completedStage = 'grid-conversion'
    if (!state.conversion.success || !state.conversion.document) {
      return buildResult(
        'failed',
        normalizePipelineError(
          state.conversion.error ?? new Error('正交迷宫转换失败。'),
          'grid-conversion',
        ),
      )
    }

    {
      const stopped = cancelledBefore('document-validation')
      if (stopped) return stopped
    }
    const document = state.conversion.document
    runStage('document-validation', () => {
      validateGridDocument(document, {
        maximumSize: MAP_SIZE_LIMITS.hardMax,
      })
    })
    completedStage = 'document-validation'

    {
      const stopped = cancelledBefore('completed')
      if (stopped) return stopped
    }
    completedStage = 'completed'
    report('completed', true)
    return buildResult('success', null, document)
  } catch (error) {
    return buildResult(
      'failed',
      normalizePipelineError(error, completedStage),
    )
  }
}
