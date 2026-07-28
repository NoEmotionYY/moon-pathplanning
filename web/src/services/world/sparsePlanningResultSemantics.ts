import type { WorldPlannerResult } from '@/types/worldPlanning'

export function getWorldPlannerResultMessage(result: WorldPlannerResult): string {
  if (result.status === 'found') return '已在当前规划窗口内找到路径。'
  if (result.status === 'no_path_in_window') {
    return '当前规划窗口内未找到路径，窗口之外仍可能存在可行路线。'
  }
  return result.error?.message ?? '规划输入无效。'
}
