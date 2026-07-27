import {
  ENTRANCE_WARNING_CODES,
  resolveEntranceDetectionOptions,
} from '@/config/entranceDetection'
import type { EntranceDetectionOptions } from '@/config/entranceDetection'
import type { EntranceCandidate } from '@/types/mazeEntrances'
import type {
  MazeCell,
  OuterBoundarySegment,
  OuterBoundarySide,
} from '@/types/mazeTopology'
import {
  getOuterBoundarySegmentIndex,
  sortOuterBoundarySegments,
} from './outerBoundaryOrdering'

const SIDE_ORDER: Readonly<Record<OuterBoundarySide, number>> = {
  top: 0,
  right: 1,
  bottom: 2,
  left: 3,
}

interface CornerDefinition {
  name: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  cell: MazeCell
  sides: readonly [OuterBoundarySide, OuterBoundarySide]
}

const candidateOrder = (
  left: EntranceCandidate,
  right: EntranceCandidate,
): number =>
  SIDE_ORDER[left.side] - SIDE_ORDER[right.side] ||
  left.startIndex - right.startIndex ||
  left.endIndex - right.endIndex ||
  left.id.localeCompare(right.id)

const sameCell = (left: MazeCell, right: MazeCell): boolean =>
  left.row === right.row && left.column === right.column

const uniqueWarnings = (...groups: string[][]): string[] =>
  [...new Set(groups.flat())]

const segmentScale = (segments: OuterBoundarySegment[]): number =>
  Math.max(
    1,
    ...segments.map((segment) =>
      Math.max(
        segment.evidence.sampleBounds.width,
        segment.evidence.sampleBounds.height,
      )),
  )

const centersAreClose = (
  first: EntranceCandidate,
  second: EntranceCandidate,
): boolean => {
  const deltaX = first.centerPixel.x - second.centerPixel.x
  const deltaY = first.centerPixel.y - second.centerPixel.y
  const distance = Math.hypot(deltaX, deltaY)
  return distance <= Math.max(
    segmentScale(first.segments),
    segmentScale(second.segments),
  ) * 1.5
}

const segmentKey = (
  segment: OuterBoundarySegment,
  rows: number,
  columns: number,
): string =>
  `${segment.side}:${getOuterBoundarySegmentIndex(segment, rows, columns)}`

export function resolveCornerEntranceCandidates(
  candidates: EntranceCandidate[],
  rows: number,
  columns: number,
  options: Partial<EntranceDetectionOptions> = {},
): EntranceCandidate[] {
  const resolved = resolveEntranceDetectionOptions(options)
  const ordered = [...candidates].sort(candidateOrder)
  if (!resolved.mergeCornerOpenings || rows <= 0 || columns <= 0) {
    return ordered
  }

  const corners: CornerDefinition[] = [
    {
      name: 'top-left',
      cell: { row: 0, column: 0 },
      sides: ['top', 'left'],
    },
    {
      name: 'top-right',
      cell: { row: 0, column: columns - 1 },
      sides: ['top', 'right'],
    },
    {
      name: 'bottom-left',
      cell: { row: rows - 1, column: 0 },
      sides: ['bottom', 'left'],
    },
    {
      name: 'bottom-right',
      cell: { row: rows - 1, column: columns - 1 },
      sides: ['bottom', 'right'],
    },
  ]
  const used = new Set<string>()
  const merged: EntranceCandidate[] = []

  for (const corner of corners) {
    const first = ordered.find((candidate) =>
      !used.has(candidate.id) &&
      candidate.side === corner.sides[0] &&
      candidate.state === 'reliable' &&
      sameCell(candidate.representativeCell, corner.cell))
    const second = ordered.find((candidate) =>
      !used.has(candidate.id) &&
      candidate.side === corner.sides[1] &&
      candidate.state === 'reliable' &&
      sameCell(candidate.representativeCell, corner.cell))
    if (
      !first ||
      !second ||
      first.componentId === null ||
      first.componentId !== second.componentId ||
      !centersAreClose(first, second)
    ) {
      continue
    }

    used.add(first.id)
    used.add(second.id)
    const preferred = first.confidence >= second.confidence ? first : second
    const segmentMap = new Map<string, OuterBoundarySegment>()
    for (const segment of [...first.segments, ...second.segments]) {
      segmentMap.set(segmentKey(segment, rows, columns), segment)
    }
    const segments = sortOuterBoundarySegments(
      [...segmentMap.values()],
      rows,
      columns,
    )
    merged.push({
      ...preferred,
      id: `corner:${corner.name}:${preferred.startIndex}-${preferred.endIndex}`,
      segments,
      representativeCell: { ...corner.cell },
      interiorCell: { ...corner.cell },
      centerPixel: {
        x: (first.centerPixel.x + second.centerPixel.x) / 2,
        y: (first.centerPixel.y + second.centerPixel.y) / 2,
      },
      averageWallScore:
        (first.averageWallScore + second.averageWallScore) / 2,
      minimumSegmentConfidence: Math.min(
        first.minimumSegmentConfidence,
        second.minimumSegmentConfidence,
      ),
      confidence: Math.sqrt(first.confidence * second.confidence),
      warnings: uniqueWarnings(
        first.warnings,
        second.warnings,
        [ENTRANCE_WARNING_CODES.cornerDuplicateMerged],
      ),
    })
  }

  return [
    ...ordered.filter((candidate) => !used.has(candidate.id)),
    ...merged,
  ].sort(candidateOrder)
}
