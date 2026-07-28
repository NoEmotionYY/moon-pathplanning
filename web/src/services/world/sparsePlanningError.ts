export type SparsePlanningErrorCode =
  | 'SPARSE_PLANNING_WINDOW_INVALID'
  | 'SPARSE_PLANNING_WINDOW_TOO_SMALL'
  | 'SPARSE_PLANNING_WINDOW_TOO_LARGE'
  | 'SPARSE_PLANNING_WINDOW_CELL_LIMIT_EXCEEDED'
  | 'SPARSE_PLANNING_START_OUTSIDE_WINDOW'
  | 'SPARSE_PLANNING_GOAL_OUTSIDE_WINDOW'
  | 'SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE'
  | 'SPARSE_PLANNING_RESULT_POINT_OUT_OF_BOUNDS'
  | 'SPARSE_PLANNING_TRACE_POINT_OUT_OF_BOUNDS'
  | 'SPARSE_PLANNING_WORLD_VERSION_STALE'
  | 'SPARSE_PLANNING_MATERIALIZATION_FAILED'

const messages: Record<SparsePlanningErrorCode, string> = {
  SPARSE_PLANNING_WINDOW_INVALID: '规划窗口边界无效',
  SPARSE_PLANNING_WINDOW_TOO_SMALL: '规划窗口尺寸小于允许下限',
  SPARSE_PLANNING_WINDOW_TOO_LARGE: '规划窗口尺寸超过硬上限',
  SPARSE_PLANNING_WINDOW_CELL_LIMIT_EXCEEDED: '规划窗口单元数量超过硬上限',
  SPARSE_PLANNING_START_OUTSIDE_WINDOW: '世界起点不在规划窗口内',
  SPARSE_PLANNING_GOAL_OUTSIDE_WINDOW: '世界终点不在规划窗口内',
  SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE: '起点与终点跨度超过单个规划窗口能力',
  SPARSE_PLANNING_RESULT_POINT_OUT_OF_BOUNDS: '规划结果包含窗口外局部坐标',
  SPARSE_PLANNING_TRACE_POINT_OUT_OF_BOUNDS: '搜索轨迹包含窗口外局部坐标',
  SPARSE_PLANNING_WORLD_VERSION_STALE: '规划上下文对应的世界版本已过期',
  SPARSE_PLANNING_MATERIALIZATION_FAILED: '稀疏规划窗口物化失败',
}

export class SparsePlanningError extends Error {
  readonly code: SparsePlanningErrorCode
  readonly details?: Readonly<Record<string, unknown>>

  constructor(
    code: SparsePlanningErrorCode,
    message = messages[code],
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message)
    this.name = 'SparsePlanningError'
    this.code = code
    this.details = details
  }

  toJSON(): {
    code: SparsePlanningErrorCode
    message: string
    details?: Readonly<Record<string, unknown>>
  } {
    return this.details
      ? { code: this.code, message: this.message, details: this.details }
      : { code: this.code, message: this.message }
  }
}

export const sparsePlanningError = (
  code: SparsePlanningErrorCode,
  details?: Readonly<Record<string, unknown>>,
): SparsePlanningError => new SparsePlanningError(code, messages[code], details)
