export interface OrthogonalGridConversionOptions {
  movement: 'four_way'
  openOuterBoundary: boolean
  useStableEntranceOrder: boolean
  preserveUncertainAsWall: boolean
  requireSelectedEntrancePair: boolean
  allowLowConfidenceManualPair: boolean
}

export const DEFAULT_ORTHOGONAL_GRID_CONVERSION_OPTIONS:
  Readonly<OrthogonalGridConversionOptions> = {
  movement: 'four_way',
  openOuterBoundary: true,
  useStableEntranceOrder: true,
  preserveUncertainAsWall: true,
  requireSelectedEntrancePair: true,
  allowLowConfidenceManualPair: false,
}

export const GRID_CONVERSION_CODES = {
  orthogonalDetectionRequired:
    'GRID_CONVERSION_ORTHOGONAL_DETECTION_REQUIRED',
  topologyRequired: 'GRID_CONVERSION_TOPOLOGY_REQUIRED',
  entrancePairRequired: 'ENTRANCE_PAIR_REQUIRED',
  entrancePairAmbiguous: 'ENTRANCE_PAIR_AMBIGUOUS',
  entrancePairDisconnected: 'ENTRANCE_PAIR_DISCONNECTED',
  entrancePairLowConfidence: 'ENTRANCE_PAIR_LOW_CONFIDENCE',
  sizeTooSmall: 'GRID_CONVERSION_SIZE_TOO_SMALL',
  sizeExceeded: 'GRID_CONVERSION_SIZE_EXCEEDED',
  largeMap: 'GRID_CONVERSION_LARGE_MAP',
  cellOutOfRange: 'GRID_CONVERSION_CELL_OUT_OF_RANGE',
  edgeInvalid: 'GRID_CONVERSION_EDGE_INVALID',
  duplicateEdge: 'GRID_CONVERSION_DUPLICATE_EDGE',
  entranceInvalid: 'GRID_CONVERSION_ENTRANCE_INVALID',
  startBlocked: 'GRID_CONVERSION_START_BLOCKED',
  goalBlocked: 'GRID_CONVERSION_GOAL_BLOCKED',
  startGoalDisconnected: 'GRID_CONVERSION_START_GOAL_DISCONNECTED',
  walkableCountMismatch: 'GRID_CONVERSION_WALKABLE_COUNT_MISMATCH',
  documentInvalid: 'GRID_CONVERSION_DOCUMENT_INVALID',
  unreachableWalkableCells:
    'GRID_CONVERSION_UNREACHABLE_WALKABLE_CELLS',
} as const

export function resolveOrthogonalGridConversionOptions(
  options: Partial<OrthogonalGridConversionOptions> = {},
): OrthogonalGridConversionOptions {
  const resolved = {
    ...DEFAULT_ORTHOGONAL_GRID_CONVERSION_OPTIONS,
    ...options,
  }
  if (resolved.movement !== 'four_way') {
    throw new RangeError('正交迷宫转换仅支持 four_way。')
  }
  return resolved
}
