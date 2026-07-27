import {
  GRID_CONVERSION_CODES,
} from '@/config/orthogonalGridConversion'
import type {
  MazeAdjacencyEdge,
} from '@/types/mazeTopology'
import type {
  GridCoordinate,
  MazeCellGridMapping,
} from '@/types/orthogonalGridConversion'
import { GridConversionError } from './gridConversionError'
import {
  getConvertedGridDimensions,
  horizontalPassageToGridPoint,
  isMazeCellInBounds,
  mazeCellToGridPoint,
  verticalPassageToGridPoint,
} from './orthogonalGridCoordinates'

export interface MutableOccupancyGrid {
  width: number
  height: number
  blocked: Uint8Array
}

const pointInGrid = (
  grid: MutableOccupancyGrid,
  point: GridCoordinate,
): boolean =>
  Number.isInteger(point.x) &&
  Number.isInteger(point.y) &&
  point.x >= 0 &&
  point.x < grid.width &&
  point.y >= 0 &&
  point.y < grid.height

export function createBlockedGrid(
  width: number,
  height: number,
): MutableOccupancyGrid {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('占用网格尺寸必须是正整数。')
  }
  const blocked = new Uint8Array(width * height)
  blocked.fill(1)
  return { width, height, blocked }
}

export function setGridWalkable(
  grid: MutableOccupancyGrid,
  point: GridCoordinate,
): void {
  if (!pointInGrid(grid, point)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.cellOutOfRange,
      '待开放坐标超出转换网格。',
    )
  }
  grid.blocked[point.y * grid.width + point.x] = 0
}

export function isGridBlocked(
  grid: MutableOccupancyGrid,
  point: GridCoordinate,
): boolean {
  if (!pointInGrid(grid, point)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.cellOutOfRange,
      '待查询坐标超出转换网格。',
    )
  }
  return grid.blocked[point.y * grid.width + point.x] === 1
}

const assertExpectedDimensions = (
  grid: MutableOccupancyGrid,
  rows: number,
  columns: number,
): void => {
  const dimensions = getConvertedGridDimensions(rows, columns)
  if (grid.width !== dimensions.width || grid.height !== dimensions.height) {
    throw new RangeError('占用网格尺寸与逻辑迷宫不一致。')
  }
}

export function openMazeCellCenters(
  grid: MutableOccupancyGrid,
  rows: number,
  columns: number,
): MazeCellGridMapping[] {
  assertExpectedDimensions(grid, rows, columns)
  const mappings: MazeCellGridMapping[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = { row, column }
      const point = mazeCellToGridPoint(cell)
      setGridWalkable(grid, point)
      mappings.push({ cell, grid: point })
    }
  }
  return mappings
}

const cellIndex = (
  row: number,
  column: number,
  columns: number,
): number => row * columns + column

export function openMazePassages(
  grid: MutableOccupancyGrid,
  rows: number,
  columns: number,
  edges: MazeAdjacencyEdge[],
): GridCoordinate[] {
  assertExpectedDimensions(grid, rows, columns)
  const unique = new Map<number, GridCoordinate>()
  for (const edge of edges) {
    if (
      !isMazeCellInBounds(edge.from, rows, columns) ||
      !isMazeCellInBounds(edge.to, rows, columns)
    ) {
      throw new GridConversionError(
        GRID_CONVERSION_CODES.edgeInvalid,
        '邻接边包含越界单元。',
      )
    }
    const rowDelta = edge.to.row - edge.from.row
    const columnDelta = edge.to.column - edge.from.column
    if (Math.abs(rowDelta) + Math.abs(columnDelta) !== 1) {
      throw new GridConversionError(
        GRID_CONVERSION_CODES.edgeInvalid,
        '邻接边必须连接两个不同的四邻接单元。',
      )
    }
    const fromIndex = cellIndex(edge.from.row, edge.from.column, columns)
    const toIndex = cellIndex(edge.to.row, edge.to.column, columns)
    const lowIndex = Math.min(fromIndex, toIndex)
    const highIndex = Math.max(fromIndex, toIndex)
    const key = lowIndex * rows * columns + highIndex
    if (unique.has(key)) {
      continue
    }
    const point = rowDelta === 0
      ? horizontalPassageToGridPoint(
          edge.from.row,
          Math.min(edge.from.column, edge.to.column),
        )
      : verticalPassageToGridPoint(
          Math.min(edge.from.row, edge.to.row),
          edge.from.column,
        )
    unique.set(key, point)
  }
  const points = [...unique.values()].sort((left, right) =>
    left.y - right.y || left.x - right.x)
  for (const point of points) {
    setGridWalkable(grid, point)
  }
  return points
}
