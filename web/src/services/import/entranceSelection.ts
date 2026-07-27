import {
  ENTRANCE_WARNING_CODES,
  resolveEntranceDetectionOptions,
} from '@/config/entranceDetection'
import type { EntranceDetectionOptions } from '@/config/entranceDetection'
import type {
  EntranceSelectionResult,
  EntranceSelectionStatus,
} from '@/types/mazeEntrances'
import type { OrthogonalMazeTopology } from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import { extractEntranceCandidates } from './entranceCandidateExtractor'
import { buildEntrancePairCandidates } from './entrancePairAnalyzer'

const unavailableResult = (): EntranceSelectionResult => ({
  status: 'topology-unavailable',
  candidates: [],
  pairCandidates: [],
  selectedPair: null,
  automatic: false,
  confidence: 0,
  warnings: [ENTRANCE_WARNING_CODES.topologyUnavailable],
})

export function selectEntrancePair(
  topology: OrthogonalMazeTopology,
  detection: OrthogonalMazeDetection,
  options: Partial<EntranceDetectionOptions> = {},
): EntranceSelectionResult {
  const resolved = resolveEntranceDetectionOptions(options)
  if (!topology.analyzed || !detection.detected) {
    return unavailableResult()
  }
  const candidates = extractEntranceCandidates(
    topology,
    detection,
    resolved,
  )
  const eligible = candidates.filter(
    (candidate) => candidate.state !== 'invalid',
  )
  const pairCandidates = buildEntrancePairCandidates(
    candidates,
    topology,
    resolved,
  )
  let status: EntranceSelectionStatus
  let warnings: string[]
  if (eligible.length === 0) {
    status = 'none'
    warnings = [ENTRANCE_WARNING_CODES.noOpening]
  } else if (eligible.length === 1) {
    status = 'single'
    warnings = [ENTRANCE_WARNING_CODES.singleOpening]
  } else if (
    eligible.length > 2 ||
    eligible.length > resolved.maximumAutomaticCandidates
  ) {
    status = 'ambiguous'
    warnings = [
      ENTRANCE_WARNING_CODES.multipleOpenings,
      ENTRANCE_WARNING_CODES.pairAmbiguous,
    ]
  } else {
    const pair = pairCandidates[0]
    if (!pair || !pair.connected || !pair.sameComponent) {
      status = 'disconnected'
      warnings = [ENTRANCE_WARNING_CODES.pairDisconnected]
    } else if (
      pair.first.state !== 'reliable' ||
      pair.second.state !== 'reliable' ||
      pair.first.confidence < resolved.minimumCandidateConfidence ||
      pair.second.confidence < resolved.minimumCandidateConfidence ||
      pair.confidence < resolved.minimumAutomaticPairConfidence
    ) {
      status = 'low-confidence'
      warnings = [ENTRANCE_WARNING_CODES.pairLowConfidence]
    } else {
      status = 'selected'
      warnings = []
    }
  }

  const selectedPair =
    status === 'selected' ? (pairCandidates[0] ?? null) : null
  const confidence = selectedPair?.confidence ??
    pairCandidates[0]?.confidence ??
    eligible[0]?.confidence ??
    0
  return {
    status,
    candidates,
    pairCandidates,
    selectedPair,
    automatic: status === 'selected',
    confidence: Math.max(0, Math.min(1, confidence)),
    warnings,
  }
}
