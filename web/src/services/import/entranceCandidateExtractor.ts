import {
  ENTRANCE_DETECTION_WEIGHTS,
  ENTRANCE_WARNING_CODES,
  resolveEntranceDetectionOptions,
} from '@/config/entranceDetection'
import type { EntranceDetectionOptions } from '@/config/entranceDetection'
import type {
  EntranceCandidate,
  EntranceCandidateState,
} from '@/types/mazeEntrances'
import type {
  MazeCell,
  OrthogonalMazeTopology,
  OuterBoundarySegment,
  OuterBoundarySide,
} from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import { resolveCornerEntranceCandidates } from './cornerEntranceResolver'
import {
  getOuterBoundarySegmentIndex,
  sortOuterBoundarySegments,
} from './outerBoundaryOrdering'
import { assignCellComponents } from './topologyComponents'

const SIDE_ORDER: readonly OuterBoundarySide[] = [
  'top',
  'right',
  'bottom',
  'left',
]

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const unique = (values: string[]): string[] => [...new Set(values)]

const geometricMean = (values: number[]): number => {
  if (values.length === 0 || values.some((value) => value <= 0)) {
    return 0
  }
  return Math.exp(
    values.reduce((sum, value) => sum + Math.log(value), 0) /
      values.length,
  )
}

const cellIndex = (cell: MazeCell, columns: number): number =>
  cell.row * columns + cell.column

const cellInRange = (
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

const calculateCenterPixel = (
  side: OuterBoundarySide,
  startIndex: number,
  endIndex: number,
  detection: OrthogonalMazeDetection,
): { x: number; y: number } | null => {
  const centers: number[] = []
  if (side === 'top' || side === 'bottom') {
    for (let column = startIndex; column <= endIndex; column += 1) {
      const left = detection.vertical.lineCenters[column]
      const right = detection.vertical.lineCenters[column + 1]
      if (left === undefined || right === undefined) {
        return null
      }
      centers.push((left + right) / 2)
    }
    const y = detection.horizontal.lineCenters[
      side === 'top' ? 0 : detection.rows
    ]
    return y === undefined
      ? null
      : {
          x: centers.reduce((sum, value) => sum + value, 0) /
            centers.length,
          y,
        }
  }
  for (let row = startIndex; row <= endIndex; row += 1) {
    const top = detection.horizontal.lineCenters[row]
    const bottom = detection.horizontal.lineCenters[row + 1]
    if (top === undefined || bottom === undefined) {
      return null
    }
    centers.push((top + bottom) / 2)
  }
  const x = detection.vertical.lineCenters[
    side === 'left' ? 0 : detection.columns
  ]
  return x === undefined
    ? null
    : {
        x,
        y: centers.reduce((sum, value) => sum + value, 0) /
          centers.length,
      }
}

interface IndexedSegment {
  index: number
  segment: OuterBoundarySegment
}

const extendCore = (
  indexed: Map<number, OuterBoundarySegment>,
  coreStart: number,
  coreEnd: number,
  direction: -1 | 1,
  limit: number,
): IndexedSegment[] => {
  const uncertain: IndexedSegment[] = []
  let index = direction < 0 ? coreStart - 1 : coreEnd + 1
  while (indexed.get(index)?.evidence.state === 'uncertain') {
    const segment = indexed.get(index)
    if (segment) {
      uncertain.push({ index, segment })
    }
    index += direction
  }
  if (indexed.get(index)?.evidence.state === 'open') {
    return []
  }
  return uncertain.slice(0, limit)
}

export function extractEntranceCandidates(
  topology: OrthogonalMazeTopology,
  detection: OrthogonalMazeDetection,
  options: Partial<EntranceDetectionOptions> = {},
): EntranceCandidate[] {
  const resolved = resolveEntranceDetectionOptions(options)
  if (
    !topology.analyzed ||
    !detection.detected ||
    topology.rows !== detection.rows ||
    topology.columns !== detection.columns ||
    detection.horizontal.lineCenters.length !== detection.rows + 1 ||
    detection.vertical.lineCenters.length !== detection.columns + 1
  ) {
    return []
  }

  const { rows, columns } = topology
  const components = assignCellComponents(
    rows,
    columns,
    topology.adjacencyEdges,
  )
  const ordered = sortOuterBoundarySegments(
    topology.outerBoundaries,
    rows,
    columns,
  )
  const candidates: EntranceCandidate[] = []

  for (const side of SIDE_ORDER) {
    const indexedSegments = ordered
      .filter((segment) => segment.side === side)
      .map((segment) => ({
        index: getOuterBoundarySegmentIndex(segment, rows, columns),
        segment,
      }))
      .filter(({ index }) => index >= 0)
    const byIndex = new Map(
      indexedSegments.map(({ index, segment }) => [index, segment]),
    )
    const cores: IndexedSegment[][] = []
    let current: IndexedSegment[] = []
    for (const indexed of indexedSegments) {
      const previous = current[current.length - 1]
      if (
        indexed.segment.evidence.state === 'open' &&
        (!previous || indexed.index === previous.index + 1)
      ) {
        current.push(indexed)
      } else {
        if (current.length > 0) {
          cores.push(current)
        }
        current = indexed.segment.evidence.state === 'open'
          ? [indexed]
          : []
      }
    }
    if (current.length > 0) {
      cores.push(current)
    }

    for (const core of cores) {
      const coreStart = core[0]?.index
      const coreEnd = core[core.length - 1]?.index
      if (coreStart === undefined || coreEnd === undefined) {
        continue
      }
      const leftExtension =
        resolved.allowUncertainEdgeExtension
          ? extendCore(
              byIndex,
              coreStart,
              coreEnd,
              -1,
              resolved.maximumUncertainExtension,
            ).reverse()
          : []
      const rightExtension =
        resolved.allowUncertainEdgeExtension
          ? extendCore(
              byIndex,
              coreStart,
              coreEnd,
              1,
              Math.max(
                0,
                resolved.maximumUncertainExtension -
                  leftExtension.length,
              ),
            )
          : []
      const all = [...leftExtension, ...core, ...rightExtension]
      const startIndex = all[0]?.index ?? coreStart
      const endIndex = all[all.length - 1]?.index ?? coreEnd
      const widthInCells = endIndex - startIndex + 1
      const representativeIndex =
        startIndex + Math.floor((widthInCells - 1) / 2)
      const representativeSegment = byIndex.get(representativeIndex)
      const representativeCell = representativeSegment?.cell
      const centerPixel = calculateCenterPixel(
        side,
        startIndex,
        endIndex,
        detection,
      )
      const warnings: string[] = []
      const coreConfidences = core.map(
        ({ segment }) => segment.evidence.confidence,
      )
      const lowSegmentConfidence = coreConfidences.some(
        (confidence) =>
          confidence < resolved.minimumOpenSegmentConfidence,
      )
      if (lowSegmentConfidence) {
        warnings.push(ENTRANCE_WARNING_CODES.segmentLowConfidence)
      }
      const hasUncertainExtension =
        leftExtension.length + rightExtension.length > 0
      if (hasUncertainExtension) {
        warnings.push(ENTRANCE_WARNING_CODES.uncertainExtension)
      }
      if (widthInCells < resolved.minimumOpeningWidthInCells) {
        warnings.push(ENTRANCE_WARNING_CODES.openingTooNarrow)
      }
      if (widthInCells > resolved.maximumOpeningWidthInCells) {
        warnings.push(ENTRANCE_WARNING_CODES.openingTooWide)
      }
      if (
        !representativeCell ||
        !cellInRange(representativeCell, rows, columns) ||
        !centerPixel
      ) {
        warnings.push(ENTRANCE_WARNING_CODES.cellOutOfRange)
      }

      const componentIndex = representativeCell &&
        cellInRange(representativeCell, rows, columns)
        ? cellIndex(representativeCell, columns)
        : -1
      const componentId = componentIndex >= 0
        ? (components.componentIdByCell[componentIndex] ?? -1)
        : -1
      const componentSize = componentId >= 0
        ? (components.componentSizes[componentId] ?? 0)
        : 0
      if (componentSize === 1) {
        warnings.push(ENTRANCE_WARNING_CODES.isolatedCell)
      }
      if (componentSize < resolved.minimumConnectedComponentSize) {
        warnings.push(ENTRANCE_WARNING_CODES.componentTooSmall)
      }

      const validWidth =
        widthInCells >= resolved.minimumOpeningWidthInCells &&
        widthInCells <= resolved.maximumOpeningWidthInCells
      const validCell =
        representativeCell !== undefined &&
        cellInRange(representativeCell, rows, columns) &&
        centerPixel !== null &&
        componentId >= 0
      const widthGate = validWidth
        ? 1
        : ENTRANCE_DETECTION_WEIGHTS.invalidWidthGate
      const componentGate =
        componentSize >= resolved.minimumConnectedComponentSize
          ? 1
          : ENTRANCE_DETECTION_WEIGHTS.smallComponentGate
      const uncertainPenalty = hasUncertainExtension
        ? ENTRANCE_DETECTION_WEIGHTS.uncertainExtensionPenalty
        : 1
      const confidence = clamp01(
        topology.confidence *
        geometricMean(coreConfidences) *
        widthGate *
        componentGate *
        uncertainPenalty,
      )
      let state: EntranceCandidateState = 'reliable'
      if (!validWidth || !validCell) {
        state = 'invalid'
      } else if (
        lowSegmentConfidence ||
        hasUncertainExtension ||
        componentSize < resolved.minimumConnectedComponentSize ||
        confidence < resolved.minimumCandidateConfidence
      ) {
        state = 'uncertain'
      }
      const segments = all.map(({ segment }) => segment)
      const evidence = segments.map((segment) => segment.evidence)
      const safeCell = representativeCell ?? { row: -1, column: -1 }
      candidates.push({
        id: `${side}:${startIndex}-${endIndex}`,
        side,
        segments,
        startIndex,
        endIndex,
        widthInCells,
        representativeCell: { ...safeCell },
        interiorCell: { ...safeCell },
        centerPixel: centerPixel ?? { x: 0, y: 0 },
        averageWallScore: evidence.reduce(
          (sum, value) => sum + value.wallScore,
          0,
        ) / evidence.length,
        minimumSegmentConfidence: Math.min(
          ...evidence.map((value) => value.confidence),
        ),
        confidence,
        componentId: componentId >= 0 ? componentId : null,
        componentSize,
        state,
        warnings: unique(warnings),
      })
    }
  }

  return resolveCornerEntranceCandidates(
    candidates,
    rows,
    columns,
    resolved,
  )
}
