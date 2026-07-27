import type { Bounds } from './import'

export interface MazeCell {
  row: number
  column: number
}

export type PassageState = 'wall' | 'open' | 'uncertain'

export type BoundaryOrientation = 'horizontal' | 'vertical'

export type OuterBoundarySide = 'top' | 'right' | 'bottom' | 'left'

export interface WallSegmentEvidence {
  orientation: BoundaryOrientation
  centerCoordinate: number
  spanStart: number
  spanEnd: number
  sampleBounds: Bounds
  wallPixelRatio: number
  continuityRatio: number
  longestWallRun: number
  longestGapRun: number
  wallScore: number
  state: PassageState
  confidence: number
  warnings: string[]
}

export interface InternalBoundary {
  from: MazeCell
  to: MazeCell
  evidence: WallSegmentEvidence
}

export interface InternalBoundaryAnalysis {
  horizontal: InternalBoundary[]
  vertical: InternalBoundary[]
  warnings: string[]
}

export interface OuterBoundarySegment {
  side: OuterBoundarySide
  cell: MazeCell
  evidence: WallSegmentEvidence
}

export interface MazeAdjacencyEdge {
  from: MazeCell
  to: MazeCell
  confidence: number
  evidence: WallSegmentEvidence
}

export interface MazeTopologyMetrics {
  totalCells: number
  openPassages: number
  wallBoundaries: number
  uncertainBoundaries: number
  connectedComponents: number
  largestComponentSize: number
  isolatedCells: MazeCell[]
  visitedCells: number
  openRatio: number
  uncertainRatio: number
}

export interface OrthogonalMazeTopology {
  analyzed: boolean
  rows: number
  columns: number
  horizontalInternalBoundaries: InternalBoundary[]
  verticalInternalBoundaries: InternalBoundary[]
  outerBoundaries: OuterBoundarySegment[]
  adjacencyEdges: MazeAdjacencyEdge[]
  metrics: MazeTopologyMetrics
  confidence: number
  warnings: string[]
}

export interface TopologyDetectionOptions {
  junctionExclusionRatio: number
  minimumJunctionExclusion: number
  linePositionTolerance: number
  minimumCrossSectionWallRatio: number
  openScoreThreshold: number
  wallScoreThreshold: number
  minimumSegmentLength: number
  maximumUncertainRatio: number
  minimumTopologyConfidence: number
}

export interface MazePassageDefinition {
  from: MazeCell
  to: MazeCell
}
