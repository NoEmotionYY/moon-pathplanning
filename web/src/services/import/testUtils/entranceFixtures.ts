import type { EntranceCandidate } from '@/types/mazeEntrances'
import type {
  MazeAdjacencyEdge,
  MazeCell,
  MazeTopologyMetrics,
  OrthogonalMazeTopology,
  OuterBoundarySegment,
  OuterBoundarySide,
  PassageState,
  WallSegmentEvidence,
} from '@/types/mazeTopology'
import type {
  AxisGridEstimate,
  OrthogonalMazeDetection,
} from '@/types/orthogonalMaze'

export const makeWallEvidence = (
  state: PassageState,
  confidence = state === 'uncertain' ? 0.2 : 1,
): WallSegmentEvidence => ({
  orientation: 'horizontal',
  centerCoordinate: 0,
  spanStart: 0,
  spanEnd: 10,
  sampleBounds: { x: 0, y: 0, width: 10, height: 1 },
  wallPixelRatio: state === 'wall' ? 1 : state === 'open' ? 0 : 0.5,
  continuityRatio: state === 'wall' ? 1 : state === 'open' ? 0 : 0.5,
  longestWallRun: state === 'wall' ? 10 : 0,
  longestGapRun: state === 'open' ? 10 : 0,
  wallScore: state === 'wall' ? 1 : state === 'open' ? 0 : 0.5,
  state,
  confidence,
  warnings: [],
})

export const makeOuterSegment = (
  side: OuterBoundarySide,
  index: number,
  rows: number,
  columns: number,
  state: PassageState = 'wall',
  confidence?: number,
): OuterBoundarySegment => ({
  side,
  cell:
    side === 'top'
      ? { row: 0, column: index }
      : side === 'bottom'
        ? { row: rows - 1, column: index }
        : side === 'left'
          ? { row: index, column: 0 }
          : { row: index, column: columns - 1 },
  evidence: {
    ...makeWallEvidence(state, confidence),
    orientation:
      side === 'top' || side === 'bottom' ? 'horizontal' : 'vertical',
  },
})

const makeAxis = (
  axis: 'horizontal' | 'vertical',
  cellCount: number,
  pitch: number,
): AxisGridEstimate => ({
  axis,
  detected: true,
  pitch,
  offset: 0,
  cellCount,
  lineCenters: Array.from(
    { length: cellCount + 1 },
    (_, index) => index * pitch,
  ),
  lineBands: [],
  wallThickness: 1,
  pitchConsistency: 1,
  boundaryConfidence: 1,
  periodicityConfidence: 1,
  confidence: 1,
  warnings: [],
})

export const makeDetection = (
  rows: number,
  columns: number,
  pitch = 10,
): OrthogonalMazeDetection => ({
  detected: true,
  rows,
  columns,
  horizontal: makeAxis('horizontal', rows, pitch),
  vertical: makeAxis('vertical', columns, pitch),
  orthogonalityScore: 1,
  confidence: 1,
  warnings: [],
})

export const makeEdge = (
  from: MazeCell,
  to: MazeCell,
): MazeAdjacencyEdge => {
  const evidence = makeWallEvidence('open')
  return { from, to, confidence: 1, evidence }
}

export const makeRowMajorChainEdges = (
  rows: number,
  columns: number,
): MazeAdjacencyEdge[] => {
  const edges: MazeAdjacencyEdge[] = []
  for (let index = 1; index < rows * columns; index += 1) {
    const previous = index - 1
    const previousRow = Math.floor(previous / columns)
    const currentRow = Math.floor(index / columns)
    if (previousRow === currentRow) {
      edges.push(makeEdge(
        { row: previousRow, column: previous % columns },
        { row: currentRow, column: index % columns },
      ))
    } else {
      edges.push(makeEdge(
        { row: previousRow, column: columns - 1 },
        { row: currentRow, column: columns - 1 },
      ))
    }
  }
  return edges
}

const emptyMetrics = (
  rows: number,
  columns: number,
): MazeTopologyMetrics => ({
  totalCells: rows * columns,
  openPassages: 0,
  wallBoundaries: 0,
  uncertainBoundaries: 0,
  connectedComponents: rows * columns > 0 ? 1 : 0,
  largestComponentSize: rows * columns,
  isolatedCells: [],
  visitedCells: rows * columns,
  openRatio: 0,
  uncertainRatio: 0,
})

export const makeTopology = (
  rows: number,
  columns: number,
  outerBoundaries: OuterBoundarySegment[] = [],
  adjacencyEdges: MazeAdjacencyEdge[] = makeRowMajorChainEdges(rows, columns),
  confidence = 0.9,
): OrthogonalMazeTopology => ({
  analyzed: true,
  rows,
  columns,
  horizontalInternalBoundaries: [],
  verticalInternalBoundaries: [],
  outerBoundaries,
  adjacencyEdges,
  metrics: emptyMetrics(rows, columns),
  confidence,
  warnings: [],
})

export const makeCandidate = (
  id: string,
  side: OuterBoundarySide,
  cell: MazeCell,
  options: Partial<EntranceCandidate> = {},
): EntranceCandidate => {
  const index = side === 'top' || side === 'bottom'
    ? cell.column
    : cell.row
  const rows = Math.max(2, cell.row + 1)
  const columns = Math.max(2, cell.column + 1)
  const segment = makeOuterSegment(
    side,
    index,
    rows,
    columns,
    'open',
  )
  return {
    id,
    side,
    segments: [segment],
    startIndex: index,
    endIndex: index,
    widthInCells: 1,
    representativeCell: { ...cell },
    interiorCell: { ...cell },
    centerPixel: {
      x: side === 'left' ? 0 : (cell.column + 0.5) * 10,
      y: side === 'top' ? 0 : (cell.row + 0.5) * 10,
    },
    averageWallScore: 0,
    minimumSegmentConfidence: 1,
    confidence: 0.9,
    componentId: 0,
    componentSize: 4,
    state: 'reliable',
    warnings: [],
    ...options,
  }
}
