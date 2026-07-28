import type {
  MazeImportPipelineProgress,
  MazeImportPipelineStatus,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerResult,
  EntranceCandidateSummary,
  EntranceSelectionSummary,
} from '@/types/mazeImportWorker'
import type { EntranceSelectionStatus } from '@/types/mazeEntrances'

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

const candidate = (
  id: string,
  side: EntranceCandidateSummary['side'],
  componentId = 0,
): EntranceCandidateSummary => ({
  id,
  side,
  startIndex: 0,
  endIndex: 0,
  widthInCells: 1,
  representativeCell: { row: 0, column: 0 },
  confidence: 0.91,
  state: 'reliable',
  componentId,
  componentSize: 25,
  warnings: [],
})

export const createEntranceSelectionSummaryFixture = (
  status: EntranceSelectionStatus = 'ambiguous',
): EntranceSelectionSummary => {
  const candidates = [
    candidate('top:0-0', 'top'),
    candidate('bottom:4-4', 'bottom'),
    candidate('left:2-2', 'left'),
  ]
  if (status === 'low-confidence') {
    candidates[0] = {
      ...candidates[0]!,
      confidence: 0.56,
      state: 'uncertain',
    }
  }
  return {
    status,
    automatic: status === 'selected',
    confidence: status === 'low-confidence' ? 0.56 : 0.91,
    candidateCount: candidates.length,
    pairCandidateCount: 3,
    selectedCandidateIds:
      status === 'selected'
        ? [candidates[0]!.id, candidates[1]!.id]
        : null,
    candidates,
    pairCandidates: [
      {
        firstCandidateId: candidates[0]!.id,
        secondCandidateId: candidates[1]!.id,
        connected: true,
        sameComponent: true,
        graphDistance: 16,
        boundaryDistance: 60,
        confidence: status === 'low-confidence' ? 0.68 : 0.91,
        warnings: status === 'low-confidence'
          ? ['ENTRANCE_PAIR_LOW_CONFIDENCE']
          : [],
      },
      {
        firstCandidateId: candidates[0]!.id,
        secondCandidateId: candidates[2]!.id,
        connected: true,
        sameComponent: true,
        graphDistance: 8,
        boundaryDistance: 32,
        confidence: 0.88,
        warnings: [],
      },
      {
        firstCandidateId: candidates[1]!.id,
        secondCandidateId: candidates[2]!.id,
        connected: true,
        sameComponent: true,
        graphDistance: 9,
        boundaryDistance: 34,
        confidence: 0.88,
        warnings: [],
      },
    ],
    warnings: [],
  }
}

export const createWorkerResultWithEntrances = (
  status: MazeImportPipelineStatus = 'manual-input-required',
  entranceStatus: EntranceSelectionStatus = 'ambiguous',
): MazeImportWorkerResult => {
  const base = createWorkerResultFixture(status)
  const entranceSelection =
    createEntranceSelectionSummaryFixture(entranceStatus)
  return {
    ...base,
    diagnostics: {
      ...base.diagnostics,
      entranceStatus,
      entranceCandidateCount: entranceSelection.candidateCount,
      pairCandidateCount: entranceSelection.pairCandidateCount,
    },
    entranceSelection,
    conversion: status === 'success'
      ? {
          success: true,
          metrics: null,
          startCandidateId: entranceSelection.candidates[0]!.id,
          goalCandidateId: entranceSelection.candidates[1]!.id,
          warnings: [],
          error: null,
        }
      : null,
  }
}
