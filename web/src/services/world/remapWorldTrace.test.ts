import { describe, expect, it } from 'vitest'
import type { SearchEvent } from '@/types/trace'
import { SparseGridWorld } from './SparseGridWorld'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import {
  remapSearchEventToWorld,
  remapSearchTraceToWorld,
  remapTraceBatchToWorld,
} from './remapWorldTrace'

const context = materializeSparsePlanningWindow(
  SparseGridWorld.create({
    start: { x: -10, y: -10 },
    goal: { x: -1, y: -1 },
    worldVersion: 6,
  }),
  { bounds: { minX: -10, minY: -10, maxX: 0, maxY: 0 } },
)

const event = (
  kind: SearchEvent['kind'],
  source: SearchEvent['source'],
): SearchEvent => ({
  step: 4,
  kind,
  point: [2, 3],
  frontierSize: 8,
  source,
})

describe('remap world trace', () => {
  it.each([
    ['discovered', 'forward'],
    ['expanded', 'backward'],
    ['current', null],
  ] as const)('maps %s event with source %s', (kind, source) => {
    expect(remapSearchEventToWorld(event(kind, source), context)).toEqual({
      step: 4,
      kind,
      point: [-8, -7],
      frontierSize: 8,
      source,
    })
  })

  it.each(['recorded', 'none'] as const)('maps %s trace', (mode) => {
    const trace = { supported: mode === 'recorded', mode, totalSteps: 1, events: [event('current', null)] }
    const mapped = remapSearchTraceToWorld(trace, context)
    expect(mapped).toMatchObject({ supported: trace.supported, mode, totalSteps: 1 })
    expect(mapped.events[0]?.point).toEqual([-8, -7])
  })

  it('maps an empty batch and preserves batch metadata', () => {
    const message = {
      type: 'trace-batch' as const,
      requestId: 'request-1',
      events: [],
      offset: 10,
      done: true,
      supported: true,
      mode: 'recorded' as const,
      totalSteps: 10,
    }
    const mapped = remapTraceBatchToWorld(message, context)
    expect(mapped).toMatchObject({
      requestId: 'request-1',
      events: [],
      offset: 10,
      done: true,
      totalSteps: 10,
      sourceWorldVersion: 6,
      worldBounds: { minX: -10, minY: -10, maxX: 0, maxY: 0 },
    })
    expect(message.events).toEqual([])
  })

  it('rejects out-of-bounds trace points with a trace-specific error', () => {
    expect(() => remapSearchEventToWorld({
      ...event('current', null),
      point: [10, 0],
    }, context)).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_TRACE_POINT_OUT_OF_BOUNDS' }),
    )
  })
})
