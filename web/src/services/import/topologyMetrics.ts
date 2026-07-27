import type {
  InternalBoundaryAnalysis,
  MazeAdjacencyEdge,
  MazeCell,
  MazeTopologyMetrics,
} from '@/types/mazeTopology'
import { buildAdjacencyLists } from './mazeAdjacencyBuilder'

export function calculateTopologyMetrics(
  rows: number,
  columns: number,
  internal: InternalBoundaryAnalysis,
  edges: MazeAdjacencyEdge[],
): MazeTopologyMetrics {
  const boundaries = [...internal.horizontal, ...internal.vertical]
  const totalBoundaries = boundaries.length
  const wallBoundaries = boundaries.filter(
    (boundary) => boundary.evidence.state === 'wall',
  ).length
  const uncertainBoundaries = boundaries.filter(
    (boundary) => boundary.evidence.state === 'uncertain',
  ).length
  const totalCells = Math.max(0, rows * columns)
  const adjacency = buildAdjacencyLists(rows, columns, edges)
  const visited = new Uint8Array(totalCells)
  const queue = new Int32Array(totalCells)
  let connectedComponents = 0
  let largestComponentSize = 0
  let visitedCells = 0

  for (let start = 0; start < totalCells; start += 1) {
    if (visited[start] === 1) {
      continue
    }
    connectedComponents += 1
    let head = 0
    let tail = 0
    let componentSize = 0
    queue[tail] = start
    tail += 1
    visited[start] = 1
    while (head < tail) {
      const current = queue[head] ?? 0
      head += 1
      componentSize += 1
      visitedCells += 1
      for (const neighbor of adjacency[current] ?? []) {
        if (visited[neighbor] === 0) {
          visited[neighbor] = 1
          queue[tail] = neighbor
          tail += 1
        }
      }
    }
    largestComponentSize = Math.max(largestComponentSize, componentSize)
  }

  const isolatedCells: MazeCell[] = []
  for (let index = 0; index < totalCells; index += 1) {
    if ((adjacency[index]?.length ?? 0) === 0) {
      isolatedCells.push({
        row: Math.floor(index / columns),
        column: index % columns,
      })
    }
  }

  return {
    totalCells,
    openPassages: edges.length,
    wallBoundaries,
    uncertainBoundaries,
    connectedComponents,
    largestComponentSize,
    isolatedCells,
    visitedCells,
    openRatio: totalBoundaries === 0 ? 0 : edges.length / totalBoundaries,
    uncertainRatio:
      totalBoundaries === 0 ? 0 : uncertainBoundaries / totalBoundaries,
  }
}
