import {
  GRID_CONVERSION_CODES,
} from '@/config/orthogonalGridConversion'
import type { GridMapDocument, PointTuple } from '@/types/grid'

export interface ConvertedGridValidationResult {
  valid: boolean
  startWalkable: boolean
  goalWalkable: boolean
  connected: boolean
  reachableWalkableCells: number
  totalWalkableCells: number
  warnings: string[]
}

const inBounds = (
  point: PointTuple,
  width: number,
  height: number,
): boolean =>
  Number.isInteger(point[0]) &&
  Number.isInteger(point[1]) &&
  point[0] >= 0 &&
  point[0] < width &&
  point[1] >= 0 &&
  point[1] < height

export function validateConvertedGrid(
  document: GridMapDocument,
): ConvertedGridValidationResult {
  const { width, height } = document
  const totalCells =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
      ? width * height
      : 0
  const blocked = new Uint8Array(totalCells)
  const warnings: string[] = []
  for (const obstacle of document.obstacles) {
    if (inBounds(obstacle, width, height)) {
      blocked[obstacle[1] * width + obstacle[0]] = 1
    }
  }
  const totalWalkableCells = totalCells - blocked.reduce(
    (sum, value) => sum + value,
    0,
  )
  const startInBounds = inBounds(document.start, width, height)
  const goalInBounds = inBounds(document.goal, width, height)
  const startIndex = startInBounds
    ? document.start[1] * width + document.start[0]
    : -1
  const goalIndex = goalInBounds
    ? document.goal[1] * width + document.goal[0]
    : -1
  const startWalkable =
    startIndex >= 0 && blocked[startIndex] === 0
  const goalWalkable =
    goalIndex >= 0 && blocked[goalIndex] === 0
  if (!startWalkable) {
    warnings.push(GRID_CONVERSION_CODES.startBlocked)
  }
  if (!goalWalkable) {
    warnings.push(GRID_CONVERSION_CODES.goalBlocked)
  }

  let reachableWalkableCells = 0
  let connected = false
  if (startWalkable) {
    const visited = new Uint8Array(totalCells)
    const queue = new Int32Array(totalCells)
    let head = 0
    let tail = 0
    queue[tail] = startIndex
    tail += 1
    visited[startIndex] = 1
    while (head < tail) {
      const current = queue[head] ?? 0
      head += 1
      reachableWalkableCells += 1
      const x = current % width
      const y = Math.floor(current / width)
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ]
      for (const neighbor of neighbors) {
        if (
          neighbor >= 0 &&
          blocked[neighbor] === 0 &&
          visited[neighbor] === 0
        ) {
          visited[neighbor] = 1
          queue[tail] = neighbor
          tail += 1
        }
      }
    }
    connected = goalWalkable && visited[goalIndex] === 1
  }
  if (!connected) {
    warnings.push(GRID_CONVERSION_CODES.startGoalDisconnected)
  }
  if (reachableWalkableCells < totalWalkableCells) {
    warnings.push(GRID_CONVERSION_CODES.unreachableWalkableCells)
  }
  return {
    valid: startWalkable && goalWalkable && connected,
    startWalkable,
    goalWalkable,
    connected,
    reachableWalkableCells,
    totalWalkableCells,
    warnings: [...new Set(warnings)],
  }
}
