import type { TopologyDetectionOptions } from '@/types/mazeTopology'

export const DEFAULT_TOPOLOGY_DETECTION_OPTIONS:
  Readonly<TopologyDetectionOptions> = {
  junctionExclusionRatio: 0.15,
  minimumJunctionExclusion: 1,
  linePositionTolerance: 1,
  minimumCrossSectionWallRatio: 0.2,
  openScoreThreshold: 0.28,
  wallScoreThreshold: 0.68,
  minimumSegmentLength: 3,
  maximumUncertainRatio: 0.2,
  minimumTopologyConfidence: 0.5,
}

export const TOPOLOGY_DETECTION_WEIGHTS = {
  continuity: 0.7,
  normalizedDensity: 0.3,
  uncertainConfidenceCeiling: 0.25,
} as const

export const TOPOLOGY_WARNING_CODES = {
  wallSegmentTooShort: 'WALL_SEGMENT_TOO_SHORT',
  wallSegmentSampleOutOfBounds: 'WALL_SEGMENT_SAMPLE_OUT_OF_BOUNDS',
  wallSegmentUncertain: 'WALL_SEGMENT_UNCERTAIN',
  internalBoundaryCountMismatch: 'INTERNAL_BOUNDARY_COUNT_MISMATCH',
  outerBoundaryCountMismatch: 'OUTER_BOUNDARY_COUNT_MISMATCH',
  adjacencyDuplicateEdge: 'ADJACENCY_DUPLICATE_EDGE',
  adjacencyCellOutOfRange: 'ADJACENCY_CELL_OUT_OF_RANGE',
  topologyUncertainRatioHigh: 'TOPOLOGY_UNCERTAIN_RATIO_HIGH',
  topologyDisconnected: 'TOPOLOGY_DISCONNECTED',
  topologyIsolatedCells: 'TOPOLOGY_ISOLATED_CELLS',
  topologyConfidenceLow: 'TOPOLOGY_CONFIDENCE_LOW',
  orthogonalDetectionRequired: 'ORTHOGONAL_DETECTION_REQUIRED',
} as const
