import {
  GRID_CONVERSION_CODES,
} from '@/config/orthogonalGridConversion'
import type { GridMapDocument, PointTuple } from '@/types/grid'
import type { GridCoordinate } from '@/types/orthogonalGridConversion'
import { GridConversionError } from './gridConversionError'
import {
  isGridBlocked,
} from './orthogonalGridBuilder'
import type {
  MutableOccupancyGrid,
} from './orthogonalGridBuilder'

const samePoint = (
  left: GridCoordinate,
  right: GridCoordinate,
): boolean => left.x === right.x && left.y === right.y

export function buildGridMapDocumentFromOccupancy(
  grid: MutableOccupancyGrid,
  start: GridCoordinate,
  goal: GridCoordinate,
): GridMapDocument {
  if (samePoint(start, goal)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '起点和终点不能相同。',
    )
  }
  if (isGridBlocked(grid, start)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.startBlocked,
      '转换后的起点仍是障碍。',
    )
  }
  if (isGridBlocked(grid, goal)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.goalBlocked,
      '转换后的终点仍是障碍。',
    )
  }
  const obstacles: PointTuple[] = []
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.blocked[y * grid.width + x] === 1) {
        obstacles.push([x, y])
      }
    }
  }
  return {
    format: 'moon-pathplanning.grid.v1',
    width: grid.width,
    height: grid.height,
    start: [start.x, start.y],
    goal: [goal.x, goal.y],
    movement: 'four_way',
    obstacles,
    terrain: [],
  }
}
