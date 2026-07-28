import { createPinia, setActivePinia } from 'pinia'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import { captureMapImportSnapshot } from './mapImportSnapshot'

const result: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'astar',
  movement: 'four_way',
  path: [[1, 1], [2, 1]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  trace: {
    supported: true,
    mode: 'recorded',
    totalSteps: 1,
    events: [
      {
        step: 0,
        kind: 'expanded',
        point: [1, 1],
        frontierSize: 0,
        source: null,
      },
    ],
  },
  error: null,
}

const traceBatch: TraceBatchMessage = {
  type: 'trace-batch',
  requestId: 'snapshot-request',
  offset: 0,
  done: true,
  supported: true,
  mode: 'recorded',
  totalSteps: 1,
  events: [
    {
      step: 0,
      kind: 'expanded',
      point: [1, 1],
      frontierSize: 0,
      source: null,
    },
  ],
}

describe('mapImportSnapshot', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('显式复制地图、路径、Trace 和回放集合，不保留响应式引用', () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    grid.setObstacle({ x: 3, y: 3 })
    planner.begin('snapshot-request', grid.version, 'astar')
    planner.appendTraceBatch(traceBatch, grid.version, 'astar')
    planner.complete(
      'snapshot-request',
      result,
      12,
      grid.version,
      'astar',
    )
    planner.applyTraceIndex(0)
    planner.playbackStatus = 'playing'
    planner.playbackSpeed = 4

    const snapshot = captureMapImportSnapshot(grid, planner)

    grid.setObstacle({ x: 4, y: 4 })
    planner.result?.path[0]?.splice(0, 2, 9, 9)
    planner.traceEvents[0]?.point.splice(0, 2, 8, 8)
    planner.visitedCells.add('9,9')

    expect(snapshot.grid.document.obstacles).toEqual([[3, 3]])
    expect(snapshot.planner.result?.path[0]).toEqual([1, 1])
    expect(snapshot.planner.trace.events[0]?.point).toEqual([1, 1])
    expect(snapshot.planner.playback.visitedCells.has('9,9')).toBe(false)
    expect(snapshot.planner.playback.status).toBe('playing')
    expect(snapshot.planner.playback.speed).toBe(4)
  })

  it('包含当前请求身份和 mapVersion', () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    planner.begin('running-request', grid.version, 'astar')

    const snapshot = captureMapImportSnapshot(grid, planner)

    expect(snapshot.grid.mapVersion).toBe(grid.version)
    expect(snapshot.planner.currentRequestId).toBe('running-request')
    expect(snapshot.planner.trace.mapVersion).toBe(grid.version)
  })
})
