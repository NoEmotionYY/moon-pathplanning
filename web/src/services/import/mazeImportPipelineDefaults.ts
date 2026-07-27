import {
  DEFAULT_ENTRANCE_DETECTION_OPTIONS,
  resolveEntranceDetectionOptions,
} from '@/config/entranceDetection'
import {
  DEFAULT_ORTHOGONAL_GRID_CONVERSION_OPTIONS,
  resolveOrthogonalGridConversionOptions,
} from '@/config/orthogonalGridConversion'
import { ORTHOGONAL_DETECTION_DEFAULTS } from '@/config/orthogonalDetection'
import { DEFAULT_TOPOLOGY_DETECTION_OPTIONS } from '@/config/topologyDetection'
import type {
  MazeImportPipelineOptionOverrides,
  MazeImportPipelineOptions,
} from '@/types/mazeImportPipeline'
import { resolveOrthogonalDetectionOptions } from './axisGridDetector'
import { createDefaultMazePreprocessOptions } from './importDefaults'
import { resolveTopologyDetectionOptions } from './wallSegmentSampler'

const DEFAULT_TRANSFORM = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  invert: false,
} as const

export function resolveMazeImportPipelineOptions(
  options: MazeImportPipelineOptionOverrides = {},
): MazeImportPipelineOptions {
  return {
    transform: {
      ...DEFAULT_TRANSFORM,
      ...options.transform,
    },
    preprocess: {
      ...createDefaultMazePreprocessOptions(),
      ...options.preprocess,
    },
    orthogonalDetection: resolveOrthogonalDetectionOptions({
      ...ORTHOGONAL_DETECTION_DEFAULTS,
      ...options.orthogonalDetection,
    }),
    topologyDetection: resolveTopologyDetectionOptions({
      ...DEFAULT_TOPOLOGY_DETECTION_OPTIONS,
      ...options.topologyDetection,
    }),
    entranceDetection: resolveEntranceDetectionOptions({
      ...DEFAULT_ENTRANCE_DETECTION_OPTIONS,
      ...options.entranceDetection,
    }),
    gridConversion: resolveOrthogonalGridConversionOptions({
      ...DEFAULT_ORTHOGONAL_GRID_CONVERSION_OPTIONS,
      ...options.gridConversion,
    }),
    ...(options.manualEntrancePair
      ? {
          manualEntrancePair: {
            ...options.manualEntrancePair,
          },
        }
      : {}),
  }
}
