import {
  GRID_CONVERSION_CODES,
} from '@/config/orthogonalGridConversion'
import type { MazeCell } from '@/types/mazeTopology'
import type { GridCoordinate } from '@/types/orthogonalGridConversion'
import { GridConversionError } from './gridConversionError'

const assertNonNegativeInteger = (value: number, name: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.cellOutOfRange,
      `${name} 必须是非负整数。`,
    )
  }
}

export function mazeCellToGridPoint(
  cell: MazeCell,
): GridCoordinate {
  assertNonNegativeInteger(cell.row, 'row')
  assertNonNegativeInteger(cell.column, 'column')
  return {
    x: cell.column * 2 + 1,
    y: cell.row * 2 + 1,
  }
}

export function horizontalPassageToGridPoint(
  row: number,
  leftColumn: number,
): GridCoordinate {
  assertNonNegativeInteger(row, 'row')
  assertNonNegativeInteger(leftColumn, 'leftColumn')
  return {
    x: leftColumn * 2 + 2,
    y: row * 2 + 1,
  }
}

export function verticalPassageToGridPoint(
  topRow: number,
  column: number,
): GridCoordinate {
  assertNonNegativeInteger(topRow, 'topRow')
  assertNonNegativeInteger(column, 'column')
  return {
    x: column * 2 + 1,
    y: topRow * 2 + 2,
  }
}

export function getConvertedGridDimensions(
  rows: number,
  columns: number,
): { width: number; height: number } {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows <= 0 ||
    columns <= 0
  ) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.cellOutOfRange,
      '迷宫行列数必须是正整数。',
    )
  }
  return {
    width: columns * 2 + 1,
    height: rows * 2 + 1,
  }
}

export function isMazeCellInBounds(
  cell: MazeCell,
  rows: number,
  columns: number,
): boolean {
  return Number.isInteger(cell.row) &&
    Number.isInteger(cell.column) &&
    cell.row >= 0 &&
    cell.row < rows &&
    cell.column >= 0 &&
    cell.column < columns
}
