import {
  SPARSE_MAP_PLANNING_HINT_LIMITS,
  SPARSE_PLANNING_WINDOW_LIMITS,
} from '@/config/worldGrid'
import type {
  SparsePlanningWindowCapability,
  SparsePlanningWindowRequest,
} from '@/types/worldPlanning'
import { worldBoundsHeight, worldBoundsWidth } from './worldBounds'

const denied = (
  code: string,
  message: string,
  width = 0,
  height = 0,
): SparsePlanningWindowCapability => ({
  allowed: false,
  width,
  height,
  cellCount: Number.isSafeInteger(width * height) ? width * height : 0,
  recommended: false,
  largeWindow: false,
  warnings: [],
  error: { code, message },
})

export function assessSparsePlanningWindow(
  request: SparsePlanningWindowRequest,
): SparsePlanningWindowCapability {
  if (
    (request.maxExpandedNodes !== undefined &&
      (!Number.isInteger(request.maxExpandedNodes) ||
        request.maxExpandedNodes < 1 ||
        request.maxExpandedNodes > SPARSE_MAP_PLANNING_HINT_LIMITS.maximumExpandedNodes)) ||
    (request.timeoutMs !== undefined &&
      (!Number.isInteger(request.timeoutMs) ||
        request.timeoutMs < SPARSE_MAP_PLANNING_HINT_LIMITS.minimumTimeoutMs ||
        request.timeoutMs > SPARSE_MAP_PLANNING_HINT_LIMITS.maximumTimeoutMs)) ||
    (request.tracePolicy !== undefined &&
      request.tracePolicy !== 'full' &&
      request.tracePolicy !== 'limited' &&
      request.tracePolicy !== 'disabled')
  ) return denied('SPARSE_PLANNING_WINDOW_INVALID', '规划窗口请求参数无效')
  let width: number
  let height: number
  try {
    width = worldBoundsWidth(request.bounds)
    height = worldBoundsHeight(request.bounds)
  } catch {
    return denied('SPARSE_PLANNING_WINDOW_INVALID', '规划窗口边界无效')
  }
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    return denied('SPARSE_PLANNING_WINDOW_INVALID', '规划窗口尺寸必须是安全整数', width, height)
  }
  if (
    width < SPARSE_PLANNING_WINDOW_LIMITS.minimumDimension ||
    height < SPARSE_PLANNING_WINDOW_LIMITS.minimumDimension
  ) return denied('SPARSE_PLANNING_WINDOW_TOO_SMALL', '规划窗口任一维度不能小于 5', width, height)
  if (
    width > SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumDimension ||
    height > SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumDimension
  ) return denied('SPARSE_PLANNING_WINDOW_TOO_LARGE', '规划窗口任一维度不能超过 151', width, height)
  const cellCount = width * height
  if (
    !Number.isSafeInteger(cellCount) ||
    cellCount > SPARSE_PLANNING_WINDOW_LIMITS.hardMaximumCellCount
  ) return denied('SPARSE_PLANNING_WINDOW_CELL_LIMIT_EXCEEDED', '规划窗口单元数量超过 22,801', width, height)
  const recommended =
    width <= SPARSE_PLANNING_WINDOW_LIMITS.recommendedMaximumDimension &&
    height <= SPARSE_PLANNING_WINDOW_LIMITS.recommendedMaximumDimension
  return {
    allowed: true,
    width,
    height,
    cellCount,
    recommended,
    largeWindow: !recommended,
    warnings: recommended
      ? []
      : ['规划窗口超过推荐的 60×60，搜索时间和 Trace 内存成本可能明显升高。'],
    error: null,
  }
}
