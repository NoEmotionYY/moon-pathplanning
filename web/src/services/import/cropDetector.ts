import { IMAGE_ANALYSIS_THRESHOLDS } from '@/config/imageAnalysis'
import type {
  BinaryMask,
  ContentBoundsResult,
} from '@/types/imageAnalysis'
import { assertBinaryMask } from './imageDataValidation'
import { MazeImageProcessingError } from './imageProcessingError'

const projectionSupport = (orthogonalLength: number): number =>
  orthogonalLength < 3
    ? 1
    : Math.max(
      IMAGE_ANALYSIS_THRESHOLDS.projectionMinimumSupport,
      Math.min(
        IMAGE_ANALYSIS_THRESHOLDS.projectionSupportMax,
        Math.ceil(
          orthogonalLength *
          IMAGE_ANALYSIS_THRESHOLDS.projectionSupportRatio,
        ),
      ),
    )

export function detectContentBounds(
  mask: BinaryMask,
  options: {
    margin: number
    minimumForegroundPixels: number
  },
): ContentBoundsResult {
  assertBinaryMask(mask)
  if (
    !Number.isInteger(options.margin) ||
    options.margin < 0 ||
    !Number.isInteger(options.minimumForegroundPixels) ||
    options.minimumForegroundPixels < 1
  ) {
    throw new MazeImageProcessingError(
      'CROP_BOUNDS_INVALID',
      '裁剪边距必须为非负整数，最少前景像素必须为正整数。',
    )
  }

  const rowCounts = new Uint32Array(mask.height)
  const columnCounts = new Uint32Array(mask.width)
  let totalForeground = 0
  for (let y = 0; y < mask.height; y += 1) {
    const rowOffset = y * mask.width
    for (let x = 0; x < mask.width; x += 1) {
      if ((mask.values[rowOffset + x] ?? 0) !== 1) continue
      rowCounts[y] = (rowCounts[y] ?? 0) + 1
      columnCounts[x] = (columnCounts[x] ?? 0) + 1
      totalForeground += 1
    }
  }

  const minimumRowSupport = projectionSupport(mask.width)
  const minimumColumnSupport = projectionSupport(mask.height)
  let minX = mask.width
  let maxX = -1
  let minY = mask.height
  let maxY = -1
  for (let x = 0; x < mask.width; x += 1) {
    if ((columnCounts[x] ?? 0) >= minimumColumnSupport) {
      minX = Math.min(minX, x)
      maxX = x
    }
  }
  for (let y = 0; y < mask.height; y += 1) {
    if ((rowCounts[y] ?? 0) >= minimumRowSupport) {
      minY = Math.min(minY, y)
      maxY = y
    }
  }

  const emptyBounds = {
    x: 0,
    y: 0,
    width: mask.width,
    height: mask.height,
  }
  if (
    totalForeground < options.minimumForegroundPixels ||
    maxX < minX ||
    maxY < minY
  ) {
    return {
      found: false,
      bounds: emptyBounds,
      foregroundPixels: totalForeground,
      confidence: 0,
      warnings: ['没有检测到满足最小支持量的迷宫主体。'],
    }
  }

  let foregroundPixels = 0
  for (let y = minY; y <= maxY; y += 1) {
    const rowOffset = y * mask.width
    for (let x = minX; x <= maxX; x += 1) {
      foregroundPixels += (mask.values[rowOffset + x] ?? 0) === 1 ? 1 : 0
    }
  }
  if (foregroundPixels < options.minimumForegroundPixels) {
    return {
      found: false,
      bounds: emptyBounds,
      foregroundPixels,
      confidence: 0,
      warnings: ['投影过滤后的迷宫主体像素过少。'],
    }
  }

  const warnings: string[] = []
  const filteredPixels = totalForeground - foregroundPixels
  if (filteredPixels > 0) {
    warnings.push(`裁剪检测过滤了 ${filteredPixels} 个孤立或低支持量墙体像素。`)
  }
  const x = Math.max(0, minX - options.margin)
  const y = Math.max(0, minY - options.margin)
  const right = Math.min(mask.width, maxX + 1 + options.margin)
  const bottom = Math.min(mask.height, maxY + 1 + options.margin)

  return {
    found: true,
    bounds: {
      x,
      y,
      width: right - x,
      height: bottom - y,
    },
    foregroundPixels,
    confidence: foregroundPixels / Math.max(1, totalForeground),
    warnings,
  }
}
