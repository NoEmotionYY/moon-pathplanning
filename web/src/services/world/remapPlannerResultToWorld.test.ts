import { describe, expect, it } from 'vitest'
import type { PlannerResult } from '@/types/planner'
import { SparseGridWorld } from './SparseGridWorld'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import { remapPlannerResultToWorld } from './remapPlannerResultToWorld'

const context = materializeSparsePlanningWindow(
  SparseGridWorld.create({
    start: { x: -5, y: -5 },
    goal: { x: 4, y: 4 },
    worldVersion: 12,
  }),
  { bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 } },
)

const result = (status: PlannerResult['status']): PlannerResult => ({
  success: status === 'found',
  status,
  algorithm: 'astar',
  movement: 'four_way',
  path: status === 'found' ? [[0, 0], [9, 9]] : [],
  pathNodes: status === 'found' ? 2 : 0,
  totalCost: 9,
  visitedNodes: 20,
  expandedNodes: 10,
  iterations: 3,
  treeNodes: null,
  error: status === 'invalid_input' ? { code: 'BAD', message: '错误输入' } : null,
})

describe('remap planner result to world', () => {
  it.each([
    ['found', 'found', true],
    ['no_path', 'no_path_in_window', false],
    ['invalid_input', 'invalid_input', true],
  ] as const)('maps status %s', (local, worldStatus, conclusive) => {
    const mapped = remapPlannerResultToWorld(result(local), context)
    expect(mapped.status).toBe(worldStatus)
    expect(mapped.globallyConclusive).toBe(conclusive)
    expect(mapped.sourceWorldVersion).toBe(12)
  })

  it('maps paths and preserves metrics and error', () => {
    const input = result('found')
    const mapped = remapPlannerResultToWorld(input, context)
    expect(mapped.path).toEqual([[-5, -5], [4, 4]])
    expect(mapped).toMatchObject({
      algorithm: 'astar',
      totalCost: 9,
      visitedNodes: 20,
      expandedNodes: 10,
      iterations: 3,
      treeNodes: null,
    })
    expect(input.path).toEqual([[0, 0], [9, 9]])
  })

  it('preserves invalid input error identity', () => {
    const input = result('invalid_input')
    expect(remapPlannerResultToWorld(input, context).error).toBe(input.error)
  })

  it('maps optional trace events', () => {
    const input = {
      ...result('found'),
      trace: {
        supported: true,
        mode: 'recorded' as const,
        totalSteps: 1,
        events: [{
          step: 0,
          kind: 'current' as const,
          point: [1, 2] as [number, number],
          frontierSize: 3,
          source: null,
        }],
      },
    }
    expect(remapPlannerResultToWorld(input, context).trace?.events[0]?.point).toEqual([-4, -3])
    expect(input.trace.events[0]?.point).toEqual([1, 2])
  })
})
