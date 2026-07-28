import { describe, expect, it } from 'vitest'
import {
  distantSparseGridDocument,
  minimalSparseGridDocument,
} from '@/services/import/__fixtures__/sparseGridDocuments'
import {
  sparseGridDocumentToWorld,
  sparseGridWorldToDocument,
} from './sparseGridDocumentAdapter'
import { getSparseGridWorldMetrics } from './sparseWorldMetrics'

describe('sparse grid document adapter', () => {
  it('imports a document in one bulk build with version zero', () => {
    const document = minimalSparseGridDocument()
    const world = sparseGridDocumentToWorld(document)
    expect(world.worldVersion).toBe(0)
    expect(world.chunkCount).toBe(3)
    expect(world.isBlocked({ x: -33, y: 1 })).toBe(true)
    expect(world.terrainCost({ x: 5, y: -5 })).toBe(4)
  })

  it('exports only public cells without version or chunk internals', () => {
    const document = sparseGridWorldToDocument(sparseGridDocumentToWorld(minimalSparseGridDocument()))
    expect(document).not.toHaveProperty('worldVersion')
    expect(document).not.toHaveProperty('chunks')
    expect(document).not.toHaveProperty('width')
    expect(document.obstacles).toEqual([[-33, 1], [32, 2]])
  })

  it('round trips document content and optional hints', () => {
    const source = minimalSparseGridDocument()
    const output = sparseGridWorldToDocument(sparseGridDocumentToWorld(source), {
      viewportHint: source.viewportHint,
      planningHint: source.planningHint,
    })
    expect(output).toEqual(source)
  })

  it('handles maximally distant endpoints without intermediate chunks', () => {
    const source = distantSparseGridDocument()
    const world = sparseGridDocumentToWorld(source)
    expect(world.worldVersion).toBe(0)
    expect(world.chunkCount).toBe(1)
    expect(getSparseGridWorldMetrics(world).contentBounds).toEqual({
      minX: -1_000_000_000,
      minY: -1_000_000_000,
      maxX: 1_000_000_001,
      maxY: 1_000_000_001,
    })
    expect(sparseGridWorldToDocument(world)).toEqual(source)
  })

  it('bulk imports 100,000 cells without per-cell version increments', () => {
    const obstacles = Array.from(
      { length: 100_000 },
      (_, index) => [index * 9_000, -index * 9_000] as const,
    )
    const document = {
      format: 'moon-pathplanning.sparse-grid.v1' as const,
      start: [-1, -1] as const,
      goal: [1, 1] as const,
      movement: 'four_way' as const,
      defaultTerrainCost: 1 as const,
      obstacles,
      terrain: [],
    }
    const world = sparseGridDocumentToWorld(document)
    expect(world.worldVersion).toBe(0)
    expect(getSparseGridWorldMetrics(world).blockedCellCount).toBe(100_000)
  }, 30_000)
})
