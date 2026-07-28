export type SparsePlannerExecutionErrorCode =
  | 'SPARSE_PLANNER_ALREADY_RUNNING'
  | 'SPARSE_PLANNER_CANCELLED'
  | 'SPARSE_PLANNER_DISPOSED'
  | 'SPARSE_PLANNER_WORKER_FAILED'
  | 'SPARSE_PLANNER_REQUEST_TIMEOUT'
  | 'SPARSE_PLANNER_TRACE_CALLBACK_FAILED'
  | 'SPARSE_PLANNER_SUPERSEDED'
  | 'SPARSE_PLANNER_EXECUTION_FAILED'

const messages: Record<SparsePlannerExecutionErrorCode, string> = {
  SPARSE_PLANNER_ALREADY_RUNNING: '稀疏世界规划器已有请求正在运行',
  SPARSE_PLANNER_CANCELLED: '稀疏世界规划请求已取消',
  SPARSE_PLANNER_DISPOSED: '稀疏世界规划器已释放',
  SPARSE_PLANNER_WORKER_FAILED: '稀疏世界规划 Worker 执行失败',
  SPARSE_PLANNER_REQUEST_TIMEOUT: '稀疏世界规划请求超时',
  SPARSE_PLANNER_TRACE_CALLBACK_FAILED: '稀疏世界规划轨迹回调执行失败',
  SPARSE_PLANNER_SUPERSEDED: '稀疏世界规划请求已被后续请求取代',
  SPARSE_PLANNER_EXECUTION_FAILED: '稀疏世界规划执行失败',
}

export class SparsePlannerExecutionError extends Error {
  readonly code: SparsePlannerExecutionErrorCode
  readonly cause?: unknown
  readonly details?: Readonly<Record<string, unknown>>

  constructor(
    code: SparsePlannerExecutionErrorCode,
    message = messages[code],
    options: {
      cause?: unknown
      details?: Readonly<Record<string, unknown>>
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'SparsePlannerExecutionError'
    this.code = code
    this.cause = options.cause
    this.details = options.details
  }

  toJSON(): {
    code: SparsePlannerExecutionErrorCode
    message: string
    details?: Readonly<Record<string, unknown>>
  } {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details }
  }
}

export const sparsePlannerExecutionError = (
  code: SparsePlannerExecutionErrorCode,
  options?: { cause?: unknown; details?: Readonly<Record<string, unknown>> },
): SparsePlannerExecutionError => new SparsePlannerExecutionError(code, messages[code], options)
