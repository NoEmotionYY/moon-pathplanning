import { describe, expect, it } from 'vitest'
import type { WorldPlannerResult } from '@/types/worldPlanning'
import { getWorldPlannerResultMessage } from './sparsePlanningResultSemantics'

const result = (
  status: WorldPlannerResult['status'],
  error: WorldPlannerResult['error'] = null,
): WorldPlannerResult => ({
  success: status === 'found',
  status,
  algorithm: 'astar',
  movement: 'four_way',
  path: [],
  pathNodes: 0,
  totalCost: 0,
  visitedNodes: 0,
  expandedNodes: 0,
  iterations: null,
  treeNodes: null,
  error,
  sourceWorldVersion: 0,
  worldBounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 },
  globallyConclusive: status !== 'no_path_in_window',
})

describe('sparse planning result semantics', () => {
  it('describes a found path in the current window', () => {
    expect(getWorldPlannerResultMessage(result('found'))).toBe('已在当前规划窗口内找到路径。')
  })

  it('does not describe local no-path as globally conclusive', () => {
    const message = getWorldPlannerResultMessage(result('no_path_in_window'))
    expect(message).toContain('当前规划窗口')
    expect(message).toContain('窗口之外仍可能')
    expect(message).not.toContain('整个无限世界无路')
  })

  it('uses the planner error for invalid input with a fallback', () => {
    expect(getWorldPlannerResultMessage(result('invalid_input', {
      code: 'BAD',
      message: '输入坐标无效',
    }))).toBe('输入坐标无效')
    expect(getWorldPlannerResultMessage(result('invalid_input'))).toBe('规划输入无效。')
  })
})
