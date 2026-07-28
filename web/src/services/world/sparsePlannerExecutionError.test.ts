import { describe, expect, it } from 'vitest'
import {
  SparsePlannerExecutionError,
  sparsePlannerExecutionError,
  type SparsePlannerExecutionErrorCode,
} from './sparsePlannerExecutionError'

const codes: SparsePlannerExecutionErrorCode[] = [
  'SPARSE_PLANNER_ALREADY_RUNNING',
  'SPARSE_PLANNER_CANCELLED',
  'SPARSE_PLANNER_DISPOSED',
  'SPARSE_PLANNER_WORKER_FAILED',
  'SPARSE_PLANNER_REQUEST_TIMEOUT',
  'SPARSE_PLANNER_TRACE_CALLBACK_FAILED',
  'SPARSE_PLANNER_SUPERSEDED',
  'SPARSE_PLANNER_EXECUTION_FAILED',
]

describe('SparsePlannerExecutionError', () => {
  it.each(codes)('为 %s 提供稳定中文错误', (code) => {
    const error = sparsePlannerExecutionError(code)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(SparsePlannerExecutionError)
    expect(error.code).toBe(code)
    expect(error.message).toMatch(/[\u4e00-\u9fff]/)
  })

  it('序列化时不暴露堆栈和 cause', () => {
    const cause = new Error('internal')
    const error = sparsePlannerExecutionError('SPARSE_PLANNER_WORKER_FAILED', {
      cause,
      details: { requestId: 'r1' },
    })
    expect(error.cause).toBe(cause)
    expect(error.toJSON()).toEqual({
      code: 'SPARSE_PLANNER_WORKER_FAILED',
      message: error.message,
      details: { requestId: 'r1' },
    })
    expect(error.toJSON()).not.toHaveProperty('stack')
    expect(error.toJSON()).not.toHaveProperty('cause')
  })
})
