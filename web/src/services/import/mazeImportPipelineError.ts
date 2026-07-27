import type {
  MazeImportPipelineError,
  MazeImportPipelineStage,
} from '@/types/mazeImportPipeline'

interface CodedErrorLike {
  code: string
  message: string
  name?: string
}

const isCodedError = (error: unknown): error is CodedErrorLike => {
  if (!error || typeof error !== 'object') {
    return false
  }
  const candidate = error as Record<string, unknown>
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  )
}

export function normalizePipelineError(
  error: unknown,
  stage: MazeImportPipelineStage,
): MazeImportPipelineError {
  if (isCodedError(error)) {
    return {
      code: error.code,
      message: error.message,
      stage,
      ...(error.name ? { cause: error.name } : {}),
    }
  }
  if (error instanceof Error) {
    return {
      code: 'IMPORT_PIPELINE_FAILED',
      message: error.message || '迷宫图片分析失败。',
      stage,
      cause: error.name,
    }
  }
  return {
    code: 'IMPORT_PIPELINE_FAILED',
    message: '迷宫图片分析失败，发生未知错误。',
    stage,
  }
}

export function createCancelledPipelineError(
  stage: MazeImportPipelineStage,
): MazeImportPipelineError {
  return {
    code: 'IMPORT_CANCELLED',
    message: '迷宫图片分析已取消。',
    stage,
  }
}
