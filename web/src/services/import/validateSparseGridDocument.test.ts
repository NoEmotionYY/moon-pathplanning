import { describe, expect, it } from 'vitest'
import {
  distantSparseGridDocument,
  minimalSparseGridDocument,
} from './__fixtures__/sparseGridDocuments'
import { validateSparseGridDocument } from './validateSparseGridDocument'

const expectCode = (value: unknown, code: string) => {
  expect(() => validateSparseGridDocument(value))
    .toThrowError(expect.objectContaining({ code }))
}

describe('validateSparseGridDocument', () => {
  it('normalizes a minimal document without width or height', () => {
    const input = {
      format: 'moon-pathplanning.sparse-grid.v1',
      start: [-1, 0],
      goal: [1, 0],
      movement: 'four_way',
      defaultTerrainCost: 1,
      obstacles: [],
      terrain: [],
    }
    const result = validateSparseGridDocument(input)
    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(result).not.toHaveProperty('width')
    expect(result).not.toHaveProperty('height')
  })

  it('accepts negative, distant coordinates and valid hints', () => {
    expect(validateSparseGridDocument(minimalSparseGridDocument()))
      .toEqual(minimalSparseGridDocument())
    expect(validateSparseGridDocument(distantSparseGridDocument()))
      .toEqual(distantSparseGridDocument())
  })

  it.each([
    [{}, 'SPARSE_MAP_FORMAT_UNSUPPORTED'],
    [{ ...minimalSparseGridDocument(), format: 'x' }, 'SPARSE_MAP_FORMAT_UNSUPPORTED'],
    [{ ...minimalSparseGridDocument(), movement: 'diagonal' }, 'SPARSE_MAP_FORMAT_UNSUPPORTED'],
    [{ ...minimalSparseGridDocument(), defaultTerrainCost: 2 }, 'SPARSE_MAP_DEFAULT_TERRAIN_UNSUPPORTED'],
    [{ ...minimalSparseGridDocument(), start: [0, 0], goal: [0, 0] }, 'SPARSE_MAP_ENDPOINT_CONFLICT'],
    [{ ...minimalSparseGridDocument(), start: [1.5, 0] }, 'SPARSE_MAP_COORDINATE_INVALID'],
    [{ ...minimalSparseGridDocument(), obstacles: [[-1, 0]] }, 'SPARSE_MAP_ENDPOINT_BLOCKED'],
    [{ ...minimalSparseGridDocument(), terrain: [{ point: [-1, 0], cost: 2 }] }, 'SPARSE_MAP_ENDPOINT_TERRAIN_CONFLICT'],
    [{ ...minimalSparseGridDocument(), obstacles: [[2, 2], [2, 2]] }, 'SPARSE_MAP_DUPLICATE_OBSTACLE'],
    [{ ...minimalSparseGridDocument(), terrain: [{ point: [2, 2], cost: 2 }, { point: [2, 2], cost: 3 }] }, 'SPARSE_MAP_DUPLICATE_TERRAIN'],
    [{ ...minimalSparseGridDocument(), obstacles: [[2, 2]], terrain: [{ point: [2, 2], cost: 2 }] }, 'SPARSE_MAP_CELL_CONFLICT'],
    [{ ...minimalSparseGridDocument(), terrain: [{ point: [2, 2], cost: 0 }] }, 'SPARSE_MAP_TERRAIN_COST_INVALID'],
    [{ ...minimalSparseGridDocument(), terrain: [{ point: [2, 2], cost: Number.POSITIVE_INFINITY }] }, 'SPARSE_MAP_TERRAIN_COST_INVALID'],
    [{ ...minimalSparseGridDocument(), viewportHint: { minX: 2, minY: 0, maxX: 1, maxY: 1 } }, 'SPARSE_MAP_VIEWPORT_HINT_INVALID'],
    [{ ...minimalSparseGridDocument(), planningHint: { margin: 4097 } }, 'SPARSE_MAP_PLANNING_HINT_INVALID'],
    [{ ...minimalSparseGridDocument(), planningHint: { timeoutMs: 99 } }, 'SPARSE_MAP_PLANNING_HINT_INVALID'],
  ])('rejects invalid document %#', (value, code) => expectCode(value, code))

  it('checks obstacle limits before visiting entries', () => {
    const value = {
      ...minimalSparseGridDocument(),
      obstacles: Array.from({ length: 250_001 }, () => [2, 2]),
    }
    expectCode(value, 'SPARSE_MAP_TOO_MANY_OBSTACLES')
  })

  it('checks terrain and combined non-default limits before visiting entries', () => {
    expectCode({
      ...minimalSparseGridDocument(),
      terrain: Array.from({ length: 250_001 }, () => ({ point: [2, 2], cost: 2 })),
    }, 'SPARSE_MAP_TOO_MANY_TERRAIN_CELLS')
    expectCode({
      ...minimalSparseGridDocument(),
      obstacles: Array.from({ length: 150_001 }, () => [2, 2]),
      terrain: Array.from({ length: 150_000 }, () => ({ point: [3, 3], cost: 2 })),
    }, 'SPARSE_MAP_TOO_MANY_NON_DEFAULT_CELLS')
  })

  it('does not modify the original document', () => {
    const input = minimalSparseGridDocument()
    const obstaclesBefore = JSON.stringify(input.obstacles)
    validateSparseGridDocument(input)
    expect(JSON.stringify(input.obstacles)).toBe(obstaclesBefore)
  })
})
