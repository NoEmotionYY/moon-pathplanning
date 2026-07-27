import { describe, expect, it } from 'vitest'
import type {
  InternalBoundary,
  InternalBoundaryAnalysis,
  MazeAdjacencyEdge,
  MazeCell,
  PassageState,
  WallSegmentEvidence,
} from '@/types/mazeTopology'
import { buildMazeAdjacency } from './mazeAdjacencyBuilder'
import { calculateTopologyMetrics } from './topologyMetrics'

const evidence = (state: PassageState): WallSegmentEvidence => ({
  orientation: 'horizontal',
  centerCoordinate: 0,
  spanStart: 0,
  spanEnd: 8,
  sampleBounds: { x: 0, y: 0, width: 8, height: 1 },
  wallPixelRatio: state === 'wall' ? 1 : 0,
  continuityRatio: state === 'wall' ? 1 : 0,
  longestWallRun: state === 'wall' ? 8 : 0,
  longestGapRun: state === 'open' ? 8 : 0,
  wallScore: state === 'wall' ? 1 : state === 'open' ? 0 : 0.5,
  state,
  confidence: 1,
  warnings: [],
})

const makeBoundary = (
  from: MazeCell,
  to: MazeCell,
  state: PassageState,
): InternalBoundary => ({ from, to, evidence: evidence(state) })

const makeAnalysis = (
  boundaries: InternalBoundary[],
): InternalBoundaryAnalysis => ({
  horizontal: boundaries.filter(
    (boundary) => boundary.from.row !== boundary.to.row,
  ),
  vertical: boundaries.filter(
    (boundary) => boundary.from.column !== boundary.to.column,
  ),
  warnings: [],
})

const metricsFor = (
  rows: number,
  columns: number,
  boundaries: InternalBoundary[],
) => {
  const internal = makeAnalysis(boundaries)
  const edges = buildMazeAdjacency(rows, columns, internal)
  return calculateTopologyMetrics(rows, columns, internal, edges)
}

describe('calculateTopologyMetrics', () => {
  it('完全连通且含环的迷宫只有一个组件', () => {
    const metrics = metricsFor(2, 2, [
      makeBoundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      makeBoundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'open'),
      makeBoundary({ row: 1, column: 1 }, { row: 1, column: 0 }, 'open'),
      makeBoundary({ row: 1, column: 0 }, { row: 0, column: 0 }, 'open'),
    ])
    expect(metrics.connectedComponents).toBe(1)
    expect(metrics.largestComponentSize).toBe(4)
    expect(metrics.openPassages).toBe(4)
    expect(metrics.visitedCells).toBe(4)
  })

  it('两个独立区域返回两个组件和正确最大组件', () => {
    const metrics = metricsFor(2, 2, [
      makeBoundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      makeBoundary({ row: 1, column: 0 }, { row: 1, column: 1 }, 'open'),
      makeBoundary({ row: 0, column: 0 }, { row: 1, column: 0 }, 'wall'),
      makeBoundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'wall'),
    ])
    expect(metrics.connectedComponents).toBe(2)
    expect(metrics.largestComponentSize).toBe(2)
    expect(metrics.wallBoundaries).toBe(2)
  })

  it('孤立单元和比例统计正确，uncertain 不视为开放', () => {
    const metrics = metricsFor(1, 3, [
      makeBoundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      makeBoundary(
        { row: 0, column: 1 },
        { row: 0, column: 2 },
        'uncertain',
      ),
    ])
    expect(metrics.connectedComponents).toBe(2)
    expect(metrics.isolatedCells).toEqual([{ row: 0, column: 2 }])
    expect(metrics.openRatio).toBe(0.5)
    expect(metrics.uncertainRatio).toBe(0.5)
  })
})
