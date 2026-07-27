export interface EntranceDetectionOptions {
  minimumOpenSegmentConfidence: number
  minimumCandidateConfidence: number
  allowUncertainEdgeExtension: boolean
  maximumUncertainExtension: number
  minimumOpeningWidthInCells: number
  maximumOpeningWidthInCells: number
  requireSameConnectedComponent: boolean
  minimumConnectedComponentSize: number
  mergeCornerOpenings: boolean
  maximumAutomaticCandidates: number
  minimumAutomaticPairConfidence: number
}

export const DEFAULT_ENTRANCE_DETECTION_OPTIONS:
  Readonly<EntranceDetectionOptions> = {
  minimumOpenSegmentConfidence: 0.45,
  minimumCandidateConfidence: 0.55,
  allowUncertainEdgeExtension: true,
  maximumUncertainExtension: 1,
  minimumOpeningWidthInCells: 1,
  maximumOpeningWidthInCells: 4,
  requireSameConnectedComponent: true,
  minimumConnectedComponentSize: 2,
  mergeCornerOpenings: true,
  maximumAutomaticCandidates: 2,
  minimumAutomaticPairConfidence: 0.6,
}

export const ENTRANCE_DETECTION_WEIGHTS = {
  uncertainExtensionPenalty: 0.75,
  smallComponentGate: 0.35,
  invalidWidthGate: 0.25,
  disconnectedPairGate: 0.25,
} as const

export const ENTRANCE_WARNING_CODES = {
  topologyUnavailable: 'ENTRANCE_TOPOLOGY_UNAVAILABLE',
  noOpening: 'ENTRANCE_NO_OPENING',
  singleOpening: 'ENTRANCE_SINGLE_OPENING',
  multipleOpenings: 'ENTRANCE_MULTIPLE_OPENINGS',
  openingTooNarrow: 'ENTRANCE_OPENING_TOO_NARROW',
  openingTooWide: 'ENTRANCE_OPENING_TOO_WIDE',
  segmentLowConfidence: 'ENTRANCE_SEGMENT_LOW_CONFIDENCE',
  uncertainExtension: 'ENTRANCE_UNCERTAIN_EXTENSION',
  cellOutOfRange: 'ENTRANCE_CELL_OUT_OF_RANGE',
  isolatedCell: 'ENTRANCE_ISOLATED_CELL',
  componentTooSmall: 'ENTRANCE_COMPONENT_TOO_SMALL',
  cornerDuplicateMerged: 'ENTRANCE_CORNER_DUPLICATE_MERGED',
  pairDisconnected: 'ENTRANCE_PAIR_DISCONNECTED',
  pairLowConfidence: 'ENTRANCE_PAIR_LOW_CONFIDENCE',
  pairAmbiguous: 'ENTRANCE_PAIR_AMBIGUOUS',
} as const

export function resolveEntranceDetectionOptions(
  options: Partial<EntranceDetectionOptions> = {},
): EntranceDetectionOptions {
  const resolved = { ...DEFAULT_ENTRANCE_DETECTION_OPTIONS, ...options }
  if (
    resolved.minimumOpenSegmentConfidence < 0 ||
    resolved.minimumOpenSegmentConfidence > 1 ||
    resolved.minimumCandidateConfidence < 0 ||
    resolved.minimumCandidateConfidence > 1 ||
    resolved.minimumAutomaticPairConfidence < 0 ||
    resolved.minimumAutomaticPairConfidence > 1 ||
    !Number.isInteger(resolved.maximumUncertainExtension) ||
    resolved.maximumUncertainExtension < 0 ||
    !Number.isInteger(resolved.minimumOpeningWidthInCells) ||
    resolved.minimumOpeningWidthInCells < 1 ||
    !Number.isInteger(resolved.maximumOpeningWidthInCells) ||
    resolved.maximumOpeningWidthInCells <
      resolved.minimumOpeningWidthInCells ||
    !Number.isInteger(resolved.minimumConnectedComponentSize) ||
    resolved.minimumConnectedComponentSize < 1 ||
    !Number.isInteger(resolved.maximumAutomaticCandidates) ||
    resolved.maximumAutomaticCandidates < 2
  ) {
    throw new RangeError('入口识别配置无效。')
  }
  return resolved
}
