import type {
  OuterBoundarySegment,
  OuterBoundarySide,
} from '@/types/mazeTopology'

const SIDE_ORDER: Readonly<Record<OuterBoundarySide, number>> = {
  top: 0,
  right: 1,
  bottom: 2,
  left: 3,
}

export function getOuterBoundarySegmentIndex(
  segment: OuterBoundarySegment,
  rows: number,
  columns: number,
): number {
  const { row, column } = segment.cell
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 0 ||
    row >= rows ||
    column < 0 ||
    column >= columns
  ) {
    return -1
  }
  if (segment.side === 'top') {
    return row === 0 ? column : -1
  }
  if (segment.side === 'bottom') {
    return row === rows - 1 ? column : -1
  }
  if (segment.side === 'left') {
    return column === 0 ? row : -1
  }
  return column === columns - 1 ? row : -1
}

export function sortOuterBoundarySegments(
  segments: OuterBoundarySegment[],
  rows: number,
  columns: number,
): OuterBoundarySegment[] {
  return segments
    .map((segment, inputIndex) => ({
      segment,
      inputIndex,
      sideOrder: SIDE_ORDER[segment.side],
      segmentIndex: getOuterBoundarySegmentIndex(segment, rows, columns),
    }))
    .sort((left, right) =>
      left.sideOrder - right.sideOrder ||
      (left.segmentIndex < 0 ? Number.MAX_SAFE_INTEGER : left.segmentIndex) -
        (right.segmentIndex < 0
          ? Number.MAX_SAFE_INTEGER
          : right.segmentIndex) ||
      left.inputIndex - right.inputIndex,
    )
    .map(({ segment }) => segment)
}
