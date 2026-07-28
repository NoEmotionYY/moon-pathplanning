import type { EntranceCandidate } from '@/types/mazeEntrances'
import type { MazeImportPipelineResult } from '@/types/mazeImportPipeline'
import type {
  EntranceCandidateSummary,
  EntranceSelectionSummary,
  MazeBoundaryPreview,
  MazeImportPreviewData,
  MazeImportWorkerResult,
  MazeImportWorkerResultBase,
  MazeImportWorkerResultDetail,
  MazeOuterBoundaryPreview,
  OrthogonalGridConversionSummary,
  OrthogonalMazeDetectionSummary,
  OrthogonalMazeTopologySummary,
} from '@/types/mazeImportWorker'

const summarizeCandidate = (
  candidate: EntranceCandidate,
): EntranceCandidateSummary => ({
  id: candidate.id,
  side: candidate.side,
  startIndex: candidate.startIndex,
  endIndex: candidate.endIndex,
  widthInCells: candidate.widthInCells,
  representativeCell: { ...candidate.representativeCell },
  confidence: candidate.confidence,
  state: candidate.state,
  componentId: candidate.componentId,
  componentSize: candidate.componentSize,
  warnings: [...candidate.warnings],
})

const summarizeDetection = (
  result: MazeImportPipelineResult,
): OrthogonalMazeDetectionSummary | null => {
  const detection = result.orthogonalDetection
  return detection
    ? {
        detected: detection.detected,
        rows: detection.rows,
        columns: detection.columns,
        confidence: detection.confidence,
        orthogonalityScore: detection.orthogonalityScore,
        warnings: [...detection.warnings],
      }
    : null
}

const summarizeTopology = (
  result: MazeImportPipelineResult,
): OrthogonalMazeTopologySummary | null => {
  const topology = result.topology
  return topology
    ? {
        analyzed: topology.analyzed,
        rows: topology.rows,
        columns: topology.columns,
        confidence: topology.confidence,
        connectedComponents: topology.metrics.connectedComponents,
        uncertainBoundaries: topology.metrics.uncertainBoundaries,
        warnings: [...topology.warnings],
      }
    : null
}

const summarizeEntrance = (
  result: MazeImportPipelineResult,
): EntranceSelectionSummary | null => {
  const selection = result.entranceSelection
  if (!selection) {
    return null
  }
  return {
    status: selection.status,
    automatic: selection.automatic,
    confidence: selection.confidence,
    candidateCount: selection.candidates.length,
    pairCandidateCount: selection.pairCandidates.length,
    selectedCandidateIds: selection.selectedPair
      ? [selection.selectedPair.first.id, selection.selectedPair.second.id]
      : null,
    candidates: selection.candidates.map(summarizeCandidate),
    pairCandidates: selection.pairCandidates.map((pair) => ({
      firstCandidateId: pair.first.id,
      secondCandidateId: pair.second.id,
      connected: pair.connected,
      sameComponent: pair.sameComponent,
      graphDistance: pair.graphDistance,
      boundaryDistance: pair.boundaryDistance,
      confidence: pair.confidence,
      warnings: [...pair.warnings],
    })),
    warnings: [...selection.warnings],
  }
}

const summarizeConversion = (
  result: MazeImportPipelineResult,
): OrthogonalGridConversionSummary | null => {
  const conversion = result.conversion
  return conversion
    ? {
        success: conversion.success,
        metrics: conversion.metrics
          ? { ...conversion.metrics }
          : null,
        startCandidateId: conversion.startSource?.id ?? null,
        goalCandidateId: conversion.goalSource?.id ?? null,
        warnings: [...conversion.warnings],
        error: conversion.error ? { ...conversion.error } : null,
      }
    : null
}

const createBase = (
  result: MazeImportPipelineResult,
  detail: MazeImportWorkerResultDetail,
): MazeImportWorkerResultBase => ({
  detail,
  status: result.status,
  completedStage: result.completedStage,
  diagnostics: { ...result.diagnostics },
  document: result.document
    ? {
        ...result.document,
        start: [...result.document.start],
        goal: [...result.document.goal],
        obstacles: result.document.obstacles.map((point) => [...point]),
        terrain: result.document.terrain.map((cell) => ({
          point: [...cell.point],
          cost: cell.cost,
        })),
      }
    : null,
  detection: summarizeDetection(result),
  topology: summarizeTopology(result),
  entranceSelection: summarizeEntrance(result),
  conversion: summarizeConversion(result),
  warnings: result.warnings.map((warning) => ({ ...warning })),
  error: result.error ? { ...result.error } : null,
  timings: result.timings.map((timing) => ({ ...timing })),
  totalDurationMs: result.totalDurationMs,
})

const boundaryPreview = (
  boundary: {
    from: { row: number; column: number }
    to: { row: number; column: number }
    evidence: { state: MazeBoundaryPreview['state']; confidence: number }
  },
): MazeBoundaryPreview => ({
  from: { ...boundary.from },
  to: { ...boundary.to },
  state: boundary.evidence.state,
  confidence: boundary.evidence.confidence,
})

const createPreview = (
  result: MazeImportPipelineResult,
): MazeImportPreviewData => ({
  croppedMask: result.preprocess
    ? {
        width: result.preprocess.croppedMask.width,
        height: result.preprocess.croppedMask.height,
        values: result.preprocess.croppedMask.values,
      }
    : null,
  horizontalLineCenters: [
    ...(result.orthogonalDetection?.horizontal.lineCenters ?? []),
  ],
  verticalLineCenters: [
    ...(result.orthogonalDetection?.vertical.lineCenters ?? []),
  ],
  horizontalBoundaries:
    result.topology?.horizontalInternalBoundaries.map(
      boundaryPreview,
    ) ?? [],
  verticalBoundaries:
    result.topology?.verticalInternalBoundaries.map(
      boundaryPreview,
    ) ?? [],
  outerBoundaries:
    result.topology?.outerBoundaries.map(
      (boundary): MazeOuterBoundaryPreview => ({
        side: boundary.side,
        cell: { ...boundary.cell },
        state: boundary.evidence.state,
        confidence: boundary.evidence.confidence,
      }),
    ) ?? [],
  entranceCandidates:
    result.entranceSelection?.candidates.map(summarizeCandidate) ?? [],
})

export function createWorkerSafeResult(
  result: MazeImportPipelineResult,
  detail: MazeImportWorkerResultDetail = 'preview',
): MazeImportWorkerResult {
  const base = createBase(result, detail)
  if (detail === 'full') {
    return {
      ...base,
      detail,
      fullResult: result,
    }
  }
  if (detail === 'preview') {
    return {
      ...base,
      detail,
      preview: createPreview(result),
    }
  }
  return {
    ...base,
    detail,
  }
}
