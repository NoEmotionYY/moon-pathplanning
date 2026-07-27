import { createPinia, setActivePinia } from 'pinia'
import { usePlannerStore } from '@/stores/planner'
import { usePlayback } from './usePlayback'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'

const events: TraceBatchMessage['events'] = [
  { step: 0, kind: 'discovered', point: [0, 0], frontierSize: 1, source: null },
  { step: 1, kind: 'discovered', point: [1, 0], frontierSize: 2, source: null },
  { step: 2, kind: 'expanded', point: [0, 0], frontierSize: 1, source: null },
]

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
  trace: { supported: true, mode: 'recorded', totalSteps: events.length, events: [] },
  error: null,
}

const prepare = () => {
  const planner = usePlannerStore()
  planner.begin('trace', 1, 'astar')
  planner.appendTraceBatch({
    type: 'trace-batch',
    requestId: 'trace',
    events,
    offset: 0,
    done: true,
    supported: true,
    mode: 'recorded',
    totalSteps: events.length,
  }, 1, 'astar')
  planner.complete('trace', result, 1, 1, 'astar')
  return planner
}

describe('usePlayback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('支持播放、暂停和恢复', () => {
    const planner = prepare()
    const playback = usePlayback()
    playback.play()
    expect(planner.playbackStatus).toBe('playing')
    playback.pause()
    expect(planner.playbackStatus).toBe('paused')
    playback.resume()
    expect(planner.playbackStatus).toBe('playing')
  })

  it('支持单步、后退、seek 和倍速切换', () => {
    const planner = prepare()
    const playback = usePlayback()
    playback.stepForward()
    expect(planner.currentEventIndex).toBe(0)
    playback.stepForward()
    expect(planner.frontierCells.has('1,0')).toBe(true)
    playback.stepBackward()
    expect(planner.currentEventIndex).toBe(0)
    expect(planner.frontierCells.has('1,0')).toBe(false)
    playback.seek(2)
    expect(planner.expandedCells.has('0,0')).toBe(true)
    playback.setSpeed(8)
    expect(planner.playbackSpeed).toBe(8)
  })
})
