import type {
  MazeImportWorkerRequest,
  MazeImportWorkerResponse,
  MazeImportWorkerResult,
} from '@/types/mazeImportWorker'

const PIPELINE_STAGES = new Set([
  'validation',
  'transform',
  'preprocess',
  'orthogonal-detection',
  'topology-analysis',
  'entrance-selection',
  'grid-conversion',
  'document-validation',
  'completed',
])

const PIPELINE_STATUSES = new Set([
  'success',
  'failed',
  'cancelled',
  'unsupported-topology',
  'manual-input-required',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasRequestId = (
  value: Record<string, unknown>,
): boolean =>
  typeof value.requestId === 'string' && value.requestId.length > 0

const isProgress = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.stage === 'string' &&
    PIPELINE_STAGES.has(value.stage) &&
    Number.isInteger(value.stageIndex) &&
    Number.isInteger(value.totalStages) &&
    Number(value.totalStages) > 0 &&
    typeof value.progress === 'number' &&
    Number.isFinite(value.progress) &&
    value.progress >= 0 &&
    value.progress <= 1 &&
    typeof value.message === 'string'
  )
}

const isWorkerError = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.code === 'string' &&
  value.code.length > 0 &&
  typeof value.message === 'string'

const isDiagnostics = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.sourceWidth === 'number' &&
  typeof value.sourceHeight === 'number' &&
  typeof value.transformedWidth === 'number' &&
  typeof value.transformedHeight === 'number'

export function isMazeImportWorkerResult(
  value: unknown,
): value is MazeImportWorkerResult {
  if (!isRecord(value)) {
    return false
  }
  if (
    !['summary', 'preview', 'full'].includes(String(value.detail)) ||
    typeof value.status !== 'string' ||
    !PIPELINE_STATUSES.has(value.status) ||
    typeof value.completedStage !== 'string' ||
    !PIPELINE_STAGES.has(value.completedStage) ||
    !isDiagnostics(value.diagnostics) ||
    (value.document !== null && !isRecord(value.document)) ||
    !Array.isArray(value.warnings) ||
    !Array.isArray(value.timings) ||
    typeof value.totalDurationMs !== 'number' ||
    !Number.isFinite(value.totalDurationMs) ||
    (value.error !== null && !isWorkerError(value.error))
  ) {
    return false
  }
  if (value.detail === 'preview') {
    return isRecord(value.preview)
  }
  if (value.detail === 'full') {
    return isRecord(value.fullResult)
  }
  return true
}

export function isMazeImportWorkerResponse(
  value: unknown,
): value is MazeImportWorkerResponse {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }
  if (value.type === 'ready') {
    return Number.isInteger(value.workerGeneration) &&
      Number(value.workerGeneration) >= 0
  }
  if (!hasRequestId(value)) {
    return false
  }
  if (
    value.type === 'started' ||
    value.type === 'cancelled' ||
    value.type === 'pong'
  ) {
    return true
  }
  if (value.type === 'progress') {
    return isProgress(value.progress)
  }
  if (value.type === 'completed') {
    return isMazeImportWorkerResult(value.result)
  }
  if (value.type === 'failed') {
    return isWorkerError(value.error)
  }
  return false
}

export function isMazeImportWorkerRequest(
  value: unknown,
): value is MazeImportWorkerRequest {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    !hasRequestId(value)
  ) {
    return false
  }
  if (value.type === 'cancel' || value.type === 'ping') {
    return true
  }
  if (value.type !== 'analyze' || !isRecord(value.image)) {
    return false
  }
  const image = value.image
  return (
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.rgba instanceof Uint8ClampedArray &&
    (value.resultDetail === undefined ||
      ['summary', 'preview', 'full'].includes(
        String(value.resultDetail),
      ))
  )
}
