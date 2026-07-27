import type {
  InternalBoundary,
  InternalBoundaryAnalysis,
  MazeAdjacencyEdge,
  MazeCell,
} from '@/types/mazeTopology'

const inRange = (
  cell: MazeCell,
  rows: number,
  columns: number,
): boolean =>
  Number.isInteger(cell.row) &&
  Number.isInteger(cell.column) &&
  cell.row >= 0 &&
  cell.row < rows &&
  cell.column >= 0 &&
  cell.column < columns

const cellIndex = (cell: MazeCell, columns: number): number =>
  cell.row * columns + cell.column

const canonicalCells = (
  from: MazeCell,
  to: MazeCell,
  columns: number,
): [MazeCell, MazeCell] =>
  cellIndex(from, columns) <= cellIndex(to, columns)
    ? [from, to]
    : [to, from]

const allBoundaries = (
  internal: InternalBoundaryAnalysis,
): InternalBoundary[] => [
  ...internal.horizontal,
  ...internal.vertical,
]

export function buildMazeAdjacency(
  rows: number,
  columns: number,
  internal: InternalBoundaryAnalysis,
): MazeAdjacencyEdge[] {
  const edges: MazeAdjacencyEdge[] = []
  const seen = new Set<number>()
  for (const boundary of allBoundaries(internal)) {
    if (boundary.evidence.state !== 'open') {
      continue
    }
    const [from, to] = canonicalCells(
      boundary.from,
      boundary.to,
      columns,
    )
    if (
      !inRange(from, rows, columns) ||
      !inRange(to, rows, columns) ||
      Math.abs(from.row - to.row) +
        Math.abs(from.column - to.column) !== 1
    ) {
      continue
    }
    const fromIndex = cellIndex(from, columns)
    const toIndex = cellIndex(to, columns)
    const key = fromIndex * rows * columns + toIndex
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    edges.push({
      from: { ...from },
      to: { ...to },
      confidence: boundary.evidence.confidence,
      evidence: boundary.evidence,
    })
  }
  return edges.sort((left, right) =>
    cellIndex(left.from, columns) - cellIndex(right.from, columns) ||
    cellIndex(left.to, columns) - cellIndex(right.to, columns),
  )
}

export function buildAdjacencyLists(
  rows: number,
  columns: number,
  edges: MazeAdjacencyEdge[],
): number[][] {
  const totalCells = Math.max(0, rows * columns)
  const adjacency = Array.from({ length: totalCells }, () => [] as number[])
  for (const edge of edges) {
    if (
      !inRange(edge.from, rows, columns) ||
      !inRange(edge.to, rows, columns)
    ) {
      continue
    }
    const from = cellIndex(edge.from, columns)
    const to = cellIndex(edge.to, columns)
    if (from === to) {
      continue
    }
    const fromNeighbors = adjacency[from]
    const toNeighbors = adjacency[to]
    if (fromNeighbors && !fromNeighbors.includes(to)) {
      fromNeighbors.push(to)
    }
    if (toNeighbors && !toNeighbors.includes(from)) {
      toNeighbors.push(from)
    }
  }
  for (const neighbors of adjacency) {
    neighbors.sort((left, right) => left - right)
  }
  return adjacency
}
