import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type {
  OuterBoundarySegment,
  TopologyDetectionOptions,
} from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import {
  createWallSegmentSampler,
} from './wallSegmentSampler'

export function analyzeOuterBoundaries(
  mask: BinaryMask,
  integral: IntegralImage,
  detection: OrthogonalMazeDetection,
  options: Partial<TopologyDetectionOptions> = {},
): OuterBoundarySegment[] {
  if (!detection.detected) {
    return []
  }
  const { rows, columns, horizontal, vertical } = detection
  if (
    horizontal.lineCenters.length !== rows + 1 ||
    vertical.lineCenters.length !== columns + 1
  ) {
    return []
  }
  const result: OuterBoundarySegment[] = []
  const sampler = createWallSegmentSampler(mask, integral, options)
  const top = horizontal.lineCenters[0]
  const bottom = horizontal.lineCenters[rows]
  const left = vertical.lineCenters[0]
  const right = vertical.lineCenters[columns]
  if (
    top === undefined ||
    bottom === undefined ||
    left === undefined ||
    right === undefined
  ) {
    return result
  }

  for (let column = 0; column < columns; column += 1) {
    const xStart = vertical.lineCenters[column]
    const xEnd = vertical.lineCenters[column + 1]
    if (xStart === undefined || xEnd === undefined) {
      continue
    }
    result.push({
      side: 'top',
      cell: { row: 0, column },
      evidence: sampler.horizontal(
        top,
        xStart,
        xEnd,
        horizontal.wallThickness,
        vertical.wallThickness,
      ),
    })
  }
  for (let row = 0; row < rows; row += 1) {
    const yStart = horizontal.lineCenters[row]
    const yEnd = horizontal.lineCenters[row + 1]
    if (yStart === undefined || yEnd === undefined) {
      continue
    }
    result.push({
      side: 'right',
      cell: { row, column: columns - 1 },
      evidence: sampler.vertical(
        right,
        yStart,
        yEnd,
        vertical.wallThickness,
        horizontal.wallThickness,
      ),
    })
  }
  for (let column = columns - 1; column >= 0; column -= 1) {
    const xStart = vertical.lineCenters[column]
    const xEnd = vertical.lineCenters[column + 1]
    if (xStart === undefined || xEnd === undefined) {
      continue
    }
    result.push({
      side: 'bottom',
      cell: { row: rows - 1, column },
      evidence: sampler.horizontal(
        bottom,
        xStart,
        xEnd,
        horizontal.wallThickness,
        vertical.wallThickness,
      ),
    })
  }
  for (let row = rows - 1; row >= 0; row -= 1) {
    const yStart = horizontal.lineCenters[row]
    const yEnd = horizontal.lineCenters[row + 1]
    if (yStart === undefined || yEnd === undefined) {
      continue
    }
    result.push({
      side: 'left',
      cell: { row, column: 0 },
      evidence: sampler.vertical(
        left,
        yStart,
        yEnd,
        vertical.wallThickness,
        horizontal.wallThickness,
      ),
    })
  }
  return result
}
