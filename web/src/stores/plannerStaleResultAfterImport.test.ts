import { createPinia, setActivePinia } from 'pinia'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import { applyMapDocumentTransaction } from '@/services/import/applyMapDocumentTransaction'
import { useGridStore } from './grid'
import { usePlannerStore } from './planner'

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
  error: null,
}

const batch = (requestId: string): TraceBatchMessage => ({
  type: 'trace-batch',
  requestId,
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
  events: [
    {
      step: 0,
      kind: 'discovered',
      point: [0, 0],
      frontierSize: 1,
      source: null,
    },
  ],
})

describe('plannerStaleResultAfterImport', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('事务导入后拒绝旧 mapVersion 的晚到批次和结果，并允许新请求', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    const oldVersion = grid.version
    planner.begin('old-request', oldVersion, 'astar')

    const transaction = await applyMapDocumentTransaction(
      {
        format: 'moon-pathplanning.grid.v1',
        width: 10,
        height: 10,
        start: [0, 0],
        goal: [9, 9],
        movement: 'four_way',
        obstacles: [[2, 2]],
        terrain: [],
      },
      { source: 'maze-image' },
      {
        grid,
        planner,
        hardCancelPlanner: vi.fn(),
        stopTracePlayback: vi.fn(() => false),
      },
    )

    expect(transaction.status).toBe('success')
    expect(planner.appendTraceBatch(batch('old-request'), oldVersion, 'astar')).toBe(false)
    expect(
      planner.complete('old-request', result, 10, oldVersion, 'astar'),
    ).toBe(false)
    expect(planner.result).toBeNull()
    expect(planner.traceEvents).toEqual([])
    expect(grid.version).toBe(oldVersion + 1)

    expect(planner.begin('new-request', grid.version, 'astar')).toBe(true)
    expect(
      planner.appendTraceBatch(batch('new-request'), grid.version, 'astar'),
    ).toBe(true)
    expect(
      planner.complete(
        'new-request',
        result,
        5,
        grid.version,
        'astar',
      ),
    ).toBe(true)
    expect(planner.result?.path).toEqual(result.path)
    expect(grid.version).toBe(oldVersion + 1)
  })

  it('事务冻结期间不允许启动新规划，解冻后可启动新版本请求', () => {
    const planner = usePlannerStore()
    planner.setPlannerStartsBlocked(true)
    expect(planner.begin('blocked', 13, 'astar')).toBe(false)
    expect(planner.currentRequestId).toBeNull()

    planner.setPlannerStartsBlocked(false)
    expect(planner.begin('new-request', 13, 'astar')).toBe(true)
    expect(planner.currentRequestId).toBe('new-request')
  })
})
