import {
  DEFAULT_TOPOLOGY_DETECTION_OPTIONS,
  TOPOLOGY_DETECTION_WEIGHTS,
  TOPOLOGY_WARNING_CODES,
} from '@/config/topologyDetection'
import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type { Bounds } from '@/types/import'
import type {
  BoundaryOrientation,
  PassageState,
  TopologyDetectionOptions,
  WallSegmentEvidence,
} from '@/types/mazeTopology'
import {
  assertBinaryMask,
  assertIntegralImage,
} from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export function resolveTopologyDetectionOptions(
  options: Partial<TopologyDetectionOptions> = {},
): TopologyDetectionOptions {
  const resolved = { ...DEFAULT_TOPOLOGY_DETECTION_OPTIONS, ...options }
  if (
    resolved.openScoreThreshold < 0 ||
    resolved.wallScoreThreshold > 1 ||
    resolved.openScoreThreshold >= resolved.wallScoreThreshold
  ) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '拓扑开放阈值必须小于墙体阈值，且两者必须位于 0 到 1。',
    )
  }
  return resolved
}

const queryRegionUnchecked = (
  integral: IntegralImage,
  x: number,
  y: number,
  width: number,
  height: number,
): number => {
  const x2 = x + width
  const y2 = y + height
  const { stride, values } = integral
  return (
    (values[y2 * stride + x2] ?? 0) -
    (values[y * stride + x2] ?? 0) -
    (values[y2 * stride + x] ?? 0) +
    (values[y * stride + x] ?? 0)
  )
}

const emptyEvidence = (
  orientation: BoundaryOrientation,
  centerCoordinate: number,
  spanStart: number,
  spanEnd: number,
  sampleBounds: Bounds,
  warnings: string[],
): WallSegmentEvidence => ({
  orientation,
  centerCoordinate,
  spanStart,
  spanEnd,
  sampleBounds,
  wallPixelRatio: 0,
  continuityRatio: 0,
  longestWallRun: 0,
  longestGapRun: 0,
  wallScore: 0,
  state: 'uncertain',
  confidence: 0,
  warnings: [...new Set(warnings)],
})

const classifyConfidence = (
  wallScore: number,
  state: PassageState,
  options: TopologyDetectionOptions,
): number => {
  if (state === 'wall') {
    return clamp01(
      (wallScore - options.wallScoreThreshold) /
        (1 - options.wallScoreThreshold),
    )
  }
  if (state === 'open') {
    return options.openScoreThreshold === 0
      ? 1
      : clamp01(
          (options.openScoreThreshold - wallScore) /
            options.openScoreThreshold,
        )
  }
  const middle =
    (options.openScoreThreshold + options.wallScoreThreshold) / 2
  const halfRange =
    (options.wallScoreThreshold - options.openScoreThreshold) / 2
  const distanceFromMiddle = halfRange === 0
    ? 0
    : clamp01(Math.abs(wallScore - middle) / halfRange)
  return distanceFromMiddle *
    TOPOLOGY_DETECTION_WEIGHTS.uncertainConfidenceCeiling
}

interface SampleRequest {
  orientation: BoundaryOrientation
  centerCoordinate: number
  spanStart: number
  spanEnd: number
  wallThickness: number
  perpendicularWallThickness: number
}

const validateSamplingInputs = (
  mask: BinaryMask,
  integral: IntegralImage,
): void => {
  assertBinaryMask(mask)
  assertIntegralImage(integral)
  if (integral.width !== mask.width || integral.height !== mask.height) {
    throw new MazeImageProcessingError(
      'IMAGE_PIXEL_DATA_INVALID',
      '积分图尺寸必须与墙体蒙版一致。',
    )
  }
}

const sampleWallSegment = (
  mask: BinaryMask,
  integral: IntegralImage,
  request: SampleRequest,
  options: TopologyDetectionOptions,
): WallSegmentEvidence => {
  const spanLow = Math.min(request.spanStart, request.spanEnd)
  const spanHigh = Math.max(request.spanStart, request.spanEnd)
  const originalLength = Math.max(0, spanHigh - spanLow)
  const exclusion = Math.max(
    options.minimumJunctionExclusion,
    Math.round(originalLength * options.junctionExclusionRatio),
    Math.ceil(request.perpendicularWallThickness / 2),
  )
  const axialLimit =
    request.orientation === 'vertical' ? mask.height : mask.width
  const rawSpanStart = Math.ceil(spanLow + exclusion)
  const rawSpanEnd = Math.floor(spanHigh - exclusion)
  const spanStart = Math.max(0, rawSpanStart)
  const spanEnd = Math.min(axialLimit, rawSpanEnd)
  const center = Math.round(request.centerCoordinate)
  const radius =
    Math.floor(Math.max(1, request.wallThickness) / 2) +
    options.linePositionTolerance
  const crossLimit =
    request.orientation === 'vertical' ? mask.width : mask.height
  const rawBandStart = center - radius
  const rawBandEnd = center + radius + 1
  const bandStart = Math.max(0, rawBandStart)
  const bandEnd = Math.min(crossLimit, rawBandEnd)
  const bandWidth = Math.max(0, bandEnd - bandStart)
  const segmentLength = Math.max(0, spanEnd - spanStart)
  const sampleBounds: Bounds = request.orientation === 'vertical'
    ? {
        x: bandStart,
        y: spanStart,
        width: bandWidth,
        height: segmentLength,
      }
    : {
        x: spanStart,
        y: bandStart,
        width: segmentLength,
        height: bandWidth,
      }
  const warnings: string[] = []
  if (
    rawSpanStart < 0 ||
    rawSpanEnd > axialLimit ||
    center < 0 ||
    center >= crossLimit
  ) {
    warnings.push(TOPOLOGY_WARNING_CODES.wallSegmentSampleOutOfBounds)
  }
  if (segmentLength < options.minimumSegmentLength || bandWidth === 0) {
    warnings.push(TOPOLOGY_WARNING_CODES.wallSegmentTooShort)
    return emptyEvidence(
      request.orientation,
      request.centerCoordinate,
      spanStart,
      spanEnd,
      sampleBounds,
      warnings,
    )
  }

  let coveredCount = 0
  let longestWallRun = 0
  let longestGapRun = 0
  let wallRun = 0
  let gapRun = 0
  for (let index = 0; index < segmentLength; index += 1) {
    const wallPixels = request.orientation === 'vertical'
      ? queryRegionUnchecked(
          integral,
          bandStart,
          spanStart + index,
          bandWidth,
          1,
        )
      : queryRegionUnchecked(
          integral,
          spanStart + index,
          bandStart,
          1,
          bandWidth,
        )
    const isCovered =
      wallPixels / bandWidth >= options.minimumCrossSectionWallRatio
    if (isCovered) {
      coveredCount += 1
      wallRun += 1
      gapRun = 0
      longestWallRun = Math.max(longestWallRun, wallRun)
    } else {
      gapRun += 1
      wallRun = 0
      longestGapRun = Math.max(longestGapRun, gapRun)
    }
  }

  const regionWallPixels = queryRegionUnchecked(
    integral,
    sampleBounds.x,
    sampleBounds.y,
    sampleBounds.width,
    sampleBounds.height,
  )
  const wallPixelRatio =
    regionWallPixels / (sampleBounds.width * sampleBounds.height)
  const continuityRatio = coveredCount / segmentLength
  const expectedDensity = Math.min(
    1,
    Math.max(1, request.wallThickness) / bandWidth,
  )
  const normalizedWallDensity = clamp01(
    wallPixelRatio / Math.max(Number.EPSILON, expectedDensity),
  )
  const wallScore = clamp01(
    continuityRatio * TOPOLOGY_DETECTION_WEIGHTS.continuity +
    normalizedWallDensity *
      TOPOLOGY_DETECTION_WEIGHTS.normalizedDensity,
  )
  const state: PassageState =
    wallScore >= options.wallScoreThreshold
      ? 'wall'
      : wallScore <= options.openScoreThreshold
        ? 'open'
        : 'uncertain'
  if (state === 'uncertain') {
    warnings.push(TOPOLOGY_WARNING_CODES.wallSegmentUncertain)
  }

  return {
    orientation: request.orientation,
    centerCoordinate: request.centerCoordinate,
    spanStart,
    spanEnd,
    sampleBounds,
    wallPixelRatio,
    continuityRatio,
    longestWallRun,
    longestGapRun,
    wallScore,
    state,
    confidence: classifyConfidence(wallScore, state, options),
    warnings: [...new Set(warnings)],
  }
}

export function sampleVerticalWallSegment(
  mask: BinaryMask,
  integral: IntegralImage,
  xCenter: number,
  yStart: number,
  yEnd: number,
  wallThickness: number,
  perpendicularWallThickness: number,
  options: Partial<TopologyDetectionOptions> = {},
): WallSegmentEvidence {
  validateSamplingInputs(mask, integral)
  return sampleWallSegment(
    mask,
    integral,
    {
      orientation: 'vertical',
      centerCoordinate: xCenter,
      spanStart: yStart,
      spanEnd: yEnd,
      wallThickness,
      perpendicularWallThickness,
    },
    resolveTopologyDetectionOptions(options),
  )
}

export function sampleHorizontalWallSegment(
  mask: BinaryMask,
  integral: IntegralImage,
  yCenter: number,
  xStart: number,
  xEnd: number,
  wallThickness: number,
  perpendicularWallThickness: number,
  options: Partial<TopologyDetectionOptions> = {},
): WallSegmentEvidence {
  validateSamplingInputs(mask, integral)
  return sampleWallSegment(
    mask,
    integral,
    {
      orientation: 'horizontal',
      centerCoordinate: yCenter,
      spanStart: xStart,
      spanEnd: xEnd,
      wallThickness,
      perpendicularWallThickness,
    },
    resolveTopologyDetectionOptions(options),
  )
}

export interface PreparedWallSegmentSampler {
  vertical: (
    xCenter: number,
    yStart: number,
    yEnd: number,
    wallThickness: number,
    perpendicularWallThickness: number,
  ) => WallSegmentEvidence
  horizontal: (
    yCenter: number,
    xStart: number,
    xEnd: number,
    wallThickness: number,
    perpendicularWallThickness: number,
  ) => WallSegmentEvidence
}

export function createWallSegmentSampler(
  mask: BinaryMask,
  integral: IntegralImage,
  options: Partial<TopologyDetectionOptions> = {},
): PreparedWallSegmentSampler {
  validateSamplingInputs(mask, integral)
  const resolved = resolveTopologyDetectionOptions(options)
  return {
    vertical: (
      xCenter,
      yStart,
      yEnd,
      wallThickness,
      perpendicularWallThickness,
    ) => sampleWallSegment(
      mask,
      integral,
      {
        orientation: 'vertical',
        centerCoordinate: xCenter,
        spanStart: yStart,
        spanEnd: yEnd,
        wallThickness,
        perpendicularWallThickness,
      },
      resolved,
    ),
    horizontal: (
      yCenter,
      xStart,
      xEnd,
      wallThickness,
      perpendicularWallThickness,
    ) => sampleWallSegment(
      mask,
      integral,
      {
        orientation: 'horizontal',
        centerCoordinate: yCenter,
        spanStart: xStart,
        spanEnd: xEnd,
        wallThickness,
        perpendicularWallThickness,
      },
      resolved,
    ),
  }
}
