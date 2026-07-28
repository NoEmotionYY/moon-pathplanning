import { describe, expect, it } from 'vitest'
import { assessSparsePlanningWindow } from './sparsePlanningWindowCapability'

const request = (width: number, height: number) => ({
  bounds: { minX: 0, minY: 0, maxX: width, maxY: height },
})

describe('sparse planning window capability', () => {
  it.each([
    [5, 5, true, true],
    [60, 60, true, true],
    [61, 60, true, false],
    [151, 151, true, false],
  ])('assesses %i×%i', (width, height, allowed, recommended) => {
    const result = assessSparsePlanningWindow(request(width, height))
    expect(result.allowed).toBe(allowed)
    expect(result.recommended).toBe(recommended)
    expect(result.cellCount).toBe(width * height)
    expect(result.largeWindow).toBe(allowed && !recommended)
    expect(result.warnings.length > 0).toBe(allowed && !recommended)
  })

  it.each([
    [4, 5, 'SPARSE_PLANNING_WINDOW_TOO_SMALL'],
    [5, 4, 'SPARSE_PLANNING_WINDOW_TOO_SMALL'],
    [152, 151, 'SPARSE_PLANNING_WINDOW_TOO_LARGE'],
    [151, 152, 'SPARSE_PLANNING_WINDOW_TOO_LARGE'],
    [0, 5, 'SPARSE_PLANNING_WINDOW_TOO_SMALL'],
  ])('rejects %i×%i', (width, height, code) => {
    expect(assessSparsePlanningWindow(request(width, height))).toMatchObject({
      allowed: false,
      error: { code },
    })
  })

  it('rejects invalid bounds and request options', () => {
    expect(assessSparsePlanningWindow({
      bounds: { minX: 2, minY: 0, maxX: 1, maxY: 5 },
    }).error?.code).toBe('SPARSE_PLANNING_WINDOW_INVALID')
    expect(assessSparsePlanningWindow({
      ...request(5, 5),
      timeoutMs: 1,
    }).error?.code).toBe('SPARSE_PLANNING_WINDOW_INVALID')
  })

  it('does not modify the request', () => {
    const input = Object.freeze({
      bounds: Object.freeze({ minX: -5, minY: -5, maxX: 55, maxY: 55 }),
    })
    assessSparsePlanningWindow(input)
    expect(input.bounds).toEqual({ minX: -5, minY: -5, maxX: 55, maxY: 55 })
  })

  it.each(Array.from({ length: 19 }, (_, index) => 5 + index))(
    'keeps %i×60 inside the recommended capability',
    (width) => {
      expect(assessSparsePlanningWindow(request(width, 60))).toMatchObject({
        allowed: true,
        recommended: true,
        largeWindow: false,
        warnings: [],
      })
    },
  )

  it.each(Array.from({ length: 19 }, (_, index) => 61 + index))(
    'allows %i×60 with an explicit large-window warning',
    (width) => {
      const result = assessSparsePlanningWindow(request(width, 60))
      expect(result).toMatchObject({
        allowed: true,
        recommended: false,
        largeWindow: true,
      })
      expect(result.warnings[0]).toContain('Trace')
    },
  )
})
