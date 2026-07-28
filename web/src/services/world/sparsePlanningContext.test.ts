import { describe, expect, it } from 'vitest'
import { SparseGridWorld } from './SparseGridWorld'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import {
  assertSparsePlanningContextCurrent,
  isSparsePlanningContextStale,
} from './sparsePlanningContext'

const context = materializeSparsePlanningWindow(
  SparseGridWorld.create({
    start: { x: 0, y: 0 },
    goal: { x: 4, y: 4 },
    worldVersion: 12,
  }),
  { bounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 } },
)

describe('sparse planning context', () => {
  it('reports matching and stale versions', () => {
    expect(isSparsePlanningContextStale(context, 12)).toBe(false)
    expect(isSparsePlanningContextStale(context, 13)).toBe(true)
  })

  it('accepts the current version', () => {
    expect(() => assertSparsePlanningContextCurrent(context, 12)).not.toThrow()
  })

  it('rejects a stale version with structured details', () => {
    expect(() => assertSparsePlanningContextCurrent(context, 13)).toThrowError(
      expect.objectContaining({
        code: 'SPARSE_PLANNING_WORLD_VERSION_STALE',
        details: { sourceWorldVersion: 12, currentWorldVersion: 13 },
      }),
    )
  })
})
