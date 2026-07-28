import type { SparseGridDocument } from '@/types/sparseGridDocument'

export const minimalSparseGridDocument = (): SparseGridDocument => ({
  format: 'moon-pathplanning.sparse-grid.v1',
  start: [-1, 0],
  goal: [64, 32],
  movement: 'four_way',
  defaultTerrainCost: 1,
  obstacles: [[-33, 1], [32, 2]],
  terrain: [{ point: [5, -5], cost: 4 }],
  viewportHint: { minX: -40, minY: -10, maxX: 70, maxY: 40 },
  planningHint: {
    margin: 16,
    maxExpandedNodes: 100_000,
    timeoutMs: 10_000,
    tracePolicy: 'limited',
  },
})

export const distantSparseGridDocument = (): SparseGridDocument => ({
  format: 'moon-pathplanning.sparse-grid.v1',
  start: [-1_000_000_000, -1_000_000_000],
  goal: [1_000_000_000, 1_000_000_000],
  movement: 'eight_way',
  defaultTerrainCost: 1,
  obstacles: [[1_000_000_000, -1_000_000_000]],
  terrain: [],
})

export const makeSparseObstacles = (count: number): Array<readonly [number, number]> =>
  Array.from({ length: count }, (_, index) => [index * 10_000, -index * 10_000] as const)
