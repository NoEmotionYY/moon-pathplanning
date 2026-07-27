import {
  GRID_CONVERSION_CODES,
} from '@/config/orthogonalGridConversion'
import type { EntranceCandidate } from '@/types/mazeEntrances'
import type {
  MazeCell,
  OuterBoundarySide,
} from '@/types/mazeTopology'
import type {
  EntranceGridMapping,
  GridCoordinate,
} from '@/types/orthogonalGridConversion'
import { GridConversionError } from './gridConversionError'
import {
  isMazeCellInBounds,
  mazeCellToGridPoint,
} from './orthogonalGridCoordinates'

const cellMatchesSide = (
  cell: MazeCell,
  side: OuterBoundarySide,
  rows: number,
  columns: number,
): boolean => {
  if (!isMazeCellInBounds(cell, rows, columns)) {
    return false
  }
  if (side === 'top') {
    return cell.row === 0
  }
  if (side === 'bottom') {
    return cell.row === rows - 1
  }
  if (side === 'left') {
    return cell.column === 0
  }
  return cell.column === columns - 1
}

const boundaryPointFor = (
  side: OuterBoundarySide,
  cell: MazeCell,
  rows: number,
  columns: number,
): GridCoordinate => {
  if (!cellMatchesSide(cell, side, rows, columns)) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '入口候选单元与外边界方向不匹配。',
    )
  }
  if (side === 'top') {
    return { x: cell.column * 2 + 1, y: 0 }
  }
  if (side === 'bottom') {
    return { x: cell.column * 2 + 1, y: rows * 2 }
  }
  if (side === 'left') {
    return { x: 0, y: cell.row * 2 + 1 }
  }
  return { x: columns * 2, y: cell.row * 2 + 1 }
}

export function mapEntranceCandidateToGrid(
  candidate: EntranceCandidate,
  rows: number,
  columns: number,
): EntranceGridMapping {
  if (
    candidate.segments.length === 0 ||
    !isMazeCellInBounds(candidate.interiorCell, rows, columns) ||
    !cellMatchesSide(
      candidate.representativeCell,
      candidate.side,
      rows,
      columns,
    )
  ) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '入口候选缺少合法边界段或内部单元。',
    )
  }
  const boundaryPoint = boundaryPointFor(
    candidate.side,
    candidate.representativeCell,
    rows,
    columns,
  )
  const interiorPoint = mazeCellToGridPoint(candidate.interiorCell)
  if (
    Math.abs(boundaryPoint.x - interiorPoint.x) +
      Math.abs(boundaryPoint.y - interiorPoint.y) !== 1
  ) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '入口边界点必须与对应内部单元相邻。',
    )
  }

  const opened = new Map<string, GridCoordinate>()
  for (const segment of candidate.segments) {
    const point = boundaryPointFor(
      segment.side,
      segment.cell,
      rows,
      columns,
    )
    opened.set(`${point.x},${point.y}`, point)
  }
  const openedBoundaryPoints = [...opened.values()].sort((left, right) =>
    left.y - right.y || left.x - right.x)
  return {
    candidateId: candidate.id,
    boundaryPoint,
    interiorPoint,
    openedBoundaryPoints,
    sourceCandidate: candidate,
  }
}
