import type {
  MazeImportPipelineProgress,
  MazeImportPipelineStatus,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerResult,
} from '@/types/mazeImportWorker'

export const createWorkerResultFixture = (
  status: MazeImportPipelineStatus = 'success',
): MazeImportWorkerResult => ({
  detail: 'summary',
  status,
  completedStage: status === 'success' ? 'completed' : 'entrance-selection',
  diagnostics: {
    sourceWidth: 64,
    sourceHeight: 64,
    transformedWidth: 64,
    transformedHeight: 64,
    croppedWidth: 61,
    croppedHeight: 61,
    detectedRows: 5,
    detectedColumns: 5,
    orthogonalConfidence: 0.9,
    topologyConfidence: 0.85,
    entranceStatus: status === 'manual-input-required'
      ? 'ambiguous'
      : 'selected',
    entranceCandidateCount: 2,
    pairCandidateCount: 1,
    convertedWidth: status === 'success' ? 11 : null,
    convertedHeight: status === 'success' ? 11 : null,
    obstacleCount: status === 'success' ? 60 : null,
    walkableCount: status === 'success' ? 61 : null,
  },
  document: null,
  detection: null,
  topology: null,
  entranceSelection: null,
  conversion: null,
  warnings: [],
  error: status === 'failed'
    ? {
        code: 'PIPELINE_FAILED',
        message: '流水线失败。',
        stage: 'preprocess',
      }
    : null,
  timings: [],
  totalDurationMs: 10,
})

export const createProgressFixture = (
  progress = 0.5,
): MazeImportPipelineProgress => ({
  stage: 'preprocess',
  stageIndex: 2,
  totalStages: 9,
  progress,
  message: '预处理迷宫图片',
})
