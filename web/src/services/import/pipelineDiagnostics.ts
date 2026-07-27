import type { ImageMatrix } from '@/types/import'
import type {
  MazeImportDiagnosticSummary,
  MazeImportPipelineResult,
} from '@/types/mazeImportPipeline'

type DiagnosticInputs = Pick<
  MazeImportPipelineResult,
  | 'transformedImage'
  | 'preprocess'
  | 'orthogonalDetection'
  | 'topology'
  | 'entranceSelection'
  | 'conversion'
>

export function createPipelineDiagnostics(
  sourceImage: ImageMatrix,
  inputs: DiagnosticInputs,
): MazeImportDiagnosticSummary {
  const transformed = inputs.transformedImage
  const preprocess = inputs.preprocess
  const detection = inputs.orthogonalDetection
  const entrance = inputs.entranceSelection
  const conversion = inputs.conversion
  return {
    sourceWidth: sourceImage.width,
    sourceHeight: sourceImage.height,
    transformedWidth: transformed?.width ?? sourceImage.width,
    transformedHeight: transformed?.height ?? sourceImage.height,
    croppedWidth: preprocess?.croppedImage.width ?? null,
    croppedHeight: preprocess?.croppedImage.height ?? null,
    detectedRows: detection?.detected ? detection.rows : null,
    detectedColumns: detection?.detected ? detection.columns : null,
    orthogonalConfidence: detection?.confidence ?? null,
    topologyConfidence: inputs.topology?.confidence ?? null,
    entranceStatus: entrance?.status ?? null,
    entranceCandidateCount: entrance?.candidates.length ?? 0,
    pairCandidateCount: entrance?.pairCandidates.length ?? 0,
    convertedWidth: conversion?.document?.width ?? null,
    convertedHeight: conversion?.document?.height ?? null,
    obstacleCount: conversion?.document?.obstacles.length ?? null,
    walkableCount: conversion?.metrics?.walkableCells ?? null,
  }
}
