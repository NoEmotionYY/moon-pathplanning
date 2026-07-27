import { createPinia, setActivePinia } from 'pinia'
import { usePlannerStore } from './planner'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'

const result: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'astar',
  movement: 'four_way',
  path: [[0, 0], [1, 0]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  trace: { supported: true, mode: 'recorded', totalSteps: 2, events: [] },
  error: null,
}

const batch = (requestId: string, offset = 0): TraceBatchMessage => ({
  type: 'trace-batch',
  requestId,
  offset,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 2,
  events: [
    { step: 0, kind: 'discovered', point: [0, 0], frontierSize: 1, source: null },
    { step: 1, kind: 'expanded', point: [0, 0], frontierSize: 0, source: null },
  ],
})

describe('plannerStore 请求与追踪一致性', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('丢弃晚于新请求返回的旧响应', () => {
    const planner = usePlannerStore()
    planner.begin('old', 1, 'astar')
    planner.begin('new', 1, 'astar')
    expect(planner.complete('old', result, 2, 1, 'astar')).toBe(false)
    expect(planner.result).toBeNull()
    expect(planner.complete('new', result, 3, 1, 'astar')).toBe(true)
    expect(planner.result?.pathNodes).toBe(2)
  })

  it('地图变化后清除结果和回放并拒绝旧批次', () => {
    const planner = usePlannerStore()
    planner.begin('request', 1, 'astar')
    expect(planner.appendTraceBatch(batch('request'), 1, 'astar')).toBe(true)
    planner.complete('request', result, 2, 1, 'astar')
    planner.invalidateForMapChange()
    expect(planner.status).toBe('stale')
    expect(planner.traceEvents).toEqual([])
    expect(planner.appendTraceBatch(batch('request'), 1, 'astar')).toBe(false)
  })

  it('按事件索引重建前沿、已访问和已展开集合', () => {
    const planner = usePlannerStore()
    planner.begin('request', 4, 'astar')
    planner.appendTraceBatch(batch('request'), 4, 'astar')
    planner.complete('request', result, 2, 4, 'astar')
    planner.applyTraceIndex(0)
    expect(planner.frontierCells.has('0,0')).toBe(true)
    planner.applyTraceIndex(1)
    expect(planner.frontierCells.has('0,0')).toBe(false)
    expect(planner.expandedCells.has('0,0')).toBe(true)
  })
})
