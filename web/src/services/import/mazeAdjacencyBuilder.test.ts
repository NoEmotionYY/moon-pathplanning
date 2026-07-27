import { describe, expect, it } from 'vitest'
import type {
  InternalBoundary,
  InternalBoundaryAnalysis,
  MazeCell,
  PassageState,
  WallSegmentEvidence,
} from '@/types/mazeTopology'
import {
  buildAdjacencyLists,
  buildMazeAdjacency,
} from './mazeAdjacencyBuilder'

const evidence = (state: PassageState): WallSegmentEvidence => ({
  orientation: 'vertical',
  centerCoordinate: 0,
  spanStart: 0,
  spanEnd: 10,
  sampleBounds: { x: 0, y: 0, width: 1, height: 10 },
  wallPixelRatio: state === 'wall' ? 1 : 0,
  continuityRatio: state === 'wall' ? 1 : 0,
  longestWallRun: state === 'wall' ? 10 : 0,
  longestGapRun: state === 'open' ? 10 : 0,
  wallScore: state === 'wall' ? 1 : state === 'open' ? 0 : 0.5,
  state,
  confidence: state === 'uncertain' ? 0.1 : 1,
  warnings: [],
})

const boundary = (
  from: MazeCell,
  to: MazeCell,
  state: PassageState,
): InternalBoundary => ({ from, to, evidence: evidence(state) })

const internal = (
  boundaries: InternalBoundary[],
): InternalBoundaryAnalysis => ({
  horizontal: boundaries.filter(
    (item) => item.from.row !== item.to.row,
  ),
  vertical: boundaries.filter(
    (item) => item.from.column !== item.to.column,
  ),
  warnings: [],
})

describe('mazeAdjacencyBuilder', () => {
  it('只把 open 边界还原为稳定、无重复的规范无向边', () => {
    const analysis = internal([
      boundary({ row: 0, column: 1 }, { row: 0, column: 0 }, 'open'),
      boundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      boundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'wall'),
      boundary({ row: 0, column: 0 }, { row: 1, column: 0 }, 'uncertain'),
      boundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'open'),
    ])
    const edges = buildMazeAdjacency(2, 2, analysis)

    expect(edges.map((edge) => [edge.from, edge.to])).toEqual([
      [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
      ],
      [
        { row: 0, column: 1 },
        { row: 1, column: 1 },
      ],
    ])
  })

  it('邻接表严格对称', () => {
    const edges = buildMazeAdjacency(2, 2, internal([
      boundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      boundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'open'),
    ]))
    const lists = buildAdjacencyLists(2, 2, edges)

    for (let from = 0; from < lists.length; from += 1) {
      for (const to of lists[from] ?? []) {
        expect(lists[to]).toContain(from)
      }
    }
  })

  it.each([
    {
      name: '单行',
      rows: 1,
      columns: 3,
      boundaries: [
        boundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
        boundary({ row: 0, column: 1 }, { row: 0, column: 2 }, 'open'),
      ],
    },
    {
      name: '单列',
      rows: 3,
      columns: 1,
      boundaries: [
        boundary({ row: 0, column: 0 }, { row: 1, column: 0 }, 'open'),
        boundary({ row: 1, column: 0 }, { row: 2, column: 0 }, 'open'),
      ],
    },
  ])('$name 迷宫正确建立邻接', ({ rows, columns, boundaries }) => {
    expect(buildMazeAdjacency(
      rows,
      columns,
      internal(boundaries),
    )).toHaveLength(2)
  })

  it('环和死胡同均原样保留', () => {
    const edges = buildMazeAdjacency(2, 2, internal([
      boundary({ row: 0, column: 0 }, { row: 0, column: 1 }, 'open'),
      boundary({ row: 0, column: 1 }, { row: 1, column: 1 }, 'open'),
      boundary({ row: 1, column: 1 }, { row: 1, column: 0 }, 'open'),
      boundary({ row: 1, column: 0 }, { row: 0, column: 0 }, 'open'),
    ]))
    expect(edges).toHaveLength(4)
    expect(buildAdjacencyLists(2, 2, edges).every(
      (neighbors) => neighbors.length === 2,
    )).toBe(true)
  })
})
