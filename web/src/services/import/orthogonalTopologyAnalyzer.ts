import {
  TOPOLOGY_WARNING_CODES,
} from '@/config/topologyDetection'
import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type {
  MazeTopologyMetrics,
  OrthogonalMazeTopology,
  TopologyDetectionOptions,
  WallSegmentEvidence,
} from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import {
  assertBinaryMask,
  assertIntegralImage,
} from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'
import { analyzeInternalBoundaries } from './internalBoundaryAnalyzer'
import { buildMazeAdjacency } from './mazeAdjacencyBuilder'
import { analyzeOuterBoundaries } from './outerBoundaryAnalyzer'
import { calculateTopologyMetrics } from './topologyMetrics'
import { resolveTopologyDetectionOptions } from './wallSegmentSampler'

const emptyMetrics = (): MazeTopologyMetrics => ({
  totalCells: 0,
  openPassages: 0,
  wallBoundaries: 0,
  uncertainBoundaries: 0,
  connectedComponents: 0,
  largestComponentSize: 0,
  isolatedCells: [],
  visitedCells: 0,
  openRatio: 0,
  uncertainRatio: 0,
})

const unique = (...groups: string[][]): string[] =>
  [...new Set(groups.flat())]

const meanConfidence = (segments: WallSegmentEvidence[]): number => {
  if (segments.length === 0) {
    return 0
  }
  return segments.reduce(
    (sum, evidence) => sum + evidence.confidence,
    0,
  ) / segments.length
}

export function analyzeOrthogonalTopology(
  mask: BinaryMask,
  integral: IntegralImage,
  detection: OrthogonalMazeDetection,
  options: Partial<TopologyDetectionOptions> = {},
): OrthogonalMazeTopology {
  assertBinaryMask(mask)
  assertIntegralImage(integral)
  if (integral.width !== mask.width || integral.height !== mask.height) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '积分图尺寸必须与墙体蒙版一致。',
    )
  }
  const resolved = resolveTopologyDetectionOptions(options)
  const empty: OrthogonalMazeTopology = {
    analyzed: false,
    rows: detection.rows,
    columns: detection.columns,
    horizontalInternalBoundaries: [],
    verticalInternalBoundaries: [],
    outerBoundaries: [],
    adjacencyEdges: [],
    metrics: emptyMetrics(),
    confidence: 0,
    warnings: [],
  }
  if (!detection.detected) {
    empty.warnings.push(
      TOPOLOGY_WARNING_CODES.orthogonalDetectionRequired,
    )
    return empty
  }
  if (
    detection.horizontal.lineCenters.length !== detection.rows + 1 ||
    detection.vertical.lineCenters.length !== detection.columns + 1
  ) {
    empty.warnings.push(
      TOPOLOGY_WARNING_CODES.internalBoundaryCountMismatch,
    )
    return empty
  }

  const internal = analyzeInternalBoundaries(
    mask,
    integral,
    detection,
    resolved,
  )
  const outerBoundaries = analyzeOuterBoundaries(
    mask,
    integral,
    detection,
    resolved,
  )
  const adjacencyEdges = buildMazeAdjacency(
    detection.rows,
    detection.columns,
    internal,
  )
  const metrics = calculateTopologyMetrics(
    detection.rows,
    detection.columns,
    internal,
    adjacencyEdges,
  )
  const warnings: string[] = [...internal.warnings]
  const expectedOuterCount = 2 * detection.rows + 2 * detection.columns
  if (outerBoundaries.length !== expectedOuterCount) {
    warnings.push(TOPOLOGY_WARNING_CODES.outerBoundaryCountMismatch)
  }
  if (metrics.uncertainRatio > resolved.maximumUncertainRatio) {
    warnings.push(TOPOLOGY_WARNING_CODES.topologyUncertainRatioHigh)
  }
  if (metrics.connectedComponents > 1) {
    warnings.push(TOPOLOGY_WARNING_CODES.topologyDisconnected)
  }
  if (metrics.isolatedCells.length > 0) {
    warnings.push(TOPOLOGY_WARNING_CODES.topologyIsolatedCells)
  }

  const internalEvidence = [
    ...internal.horizontal.map((boundary) => boundary.evidence),
    ...internal.vertical.map((boundary) => boundary.evidence),
  ]
  const outerEvidence = outerBoundaries.map(
    (boundary) => boundary.evidence,
  )
  const allEvidence = [...internalEvidence, ...outerEvidence]
  const successfulSamples = allEvidence.filter((evidence) =>
    !evidence.warnings.includes(
      TOPOLOGY_WARNING_CODES.wallSegmentTooShort,
    ) &&
    evidence.sampleBounds.width > 0 &&
    evidence.sampleBounds.height > 0,
  ).length
  const samplingSuccessRatio = allEvidence.length === 0
    ? 0
    : successfulSamples / allEvidence.length
  const internalConfidence = meanConfidence(internalEvidence)
  const outerConfidence = meanConfidence(outerEvidence)
  const meanSegmentConfidence =
    internalEvidence.length === 0
      ? outerConfidence
      : Math.sqrt(internalConfidence * outerConfidence)
  const confidence = Math.max(
    0,
    Math.min(
      1,
      Math.cbrt(
        detection.confidence *
        meanSegmentConfidence *
        samplingSuccessRatio,
      ) * (1 - metrics.uncertainRatio),
    ),
  )
  if (confidence < resolved.minimumTopologyConfidence) {
    warnings.push(TOPOLOGY_WARNING_CODES.topologyConfidenceLow)
  }

  return {
    analyzed: true,
    rows: detection.rows,
    columns: detection.columns,
    horizontalInternalBoundaries: internal.horizontal,
    verticalInternalBoundaries: internal.vertical,
    outerBoundaries,
    adjacencyEdges,
    metrics,
    confidence,
    warnings: unique(
      warnings,
      ...allEvidence.map((evidence) => evidence.warnings),
    ),
  }
}
