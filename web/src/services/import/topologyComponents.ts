import type { MazeAdjacencyEdge } from '@/types/mazeTopology'
import { buildAdjacencyLists } from './mazeAdjacencyBuilder'

export interface CellComponentAssignment {
  componentIdByCell: Int32Array
  componentSizes: number[]
}

export function assignCellComponents(
  rows: number,
  columns: number,
  edges: MazeAdjacencyEdge[],
): CellComponentAssignment {
  const totalCells =
    Number.isInteger(rows) &&
    Number.isInteger(columns) &&
    rows > 0 &&
    columns > 0
      ? rows * columns
      : 0
  const componentIdByCell = new Int32Array(totalCells)
  componentIdByCell.fill(-1)
  if (totalCells === 0) {
    return { componentIdByCell, componentSizes: [] }
  }

  const adjacency = buildAdjacencyLists(rows, columns, edges)
  const queue = new Int32Array(totalCells)
  const componentSizes: number[] = []
  for (let start = 0; start < totalCells; start += 1) {
    if ((componentIdByCell[start] ?? -1) >= 0) {
      continue
    }
    const componentId = componentSizes.length
    let head = 0
    let tail = 0
    let componentSize = 0
    queue[tail] = start
    tail += 1
    componentIdByCell[start] = componentId
    while (head < tail) {
      const current = queue[head] ?? 0
      head += 1
      componentSize += 1
      for (const neighbor of adjacency[current] ?? []) {
        if ((componentIdByCell[neighbor] ?? -1) < 0) {
          componentIdByCell[neighbor] = componentId
          queue[tail] = neighbor
          tail += 1
        }
      }
    }
    componentSizes.push(componentSize)
  }
  return { componentIdByCell, componentSizes }
}
