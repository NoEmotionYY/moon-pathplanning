import {
  TOPOLOGY_WARNING_CODES,
} from '@/config/topologyDetection'
import type { BinaryMask, IntegralImage } from '@/types/imageAnalysis'
import type {
  InternalBoundaryAnalysis,
  TopologyDetectionOptions,
} from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import {
  createWallSegmentSampler,
} from './wallSegmentSampler'

export function analyzeInternalBoundaries(
  mask: BinaryMask,
  integral: IntegralImage,
  detection: OrthogonalMazeDetection,
  options: Partial<TopologyDetectionOptions> = {},
): InternalBoundaryAnalysis {
  const result: InternalBoundaryAnalysis = {
    horizontal: [],
    vertical: [],
    warnings: [],
  }
  if (!detection.detected) {
    result.warnings.push(
      TOPOLOGY_WARNING_CODES.orthogonalDetectionRequired,
    )
    return result
  }

  const { rows, columns, horizontal, vertical } = detection
  const sampler = createWallSegmentSampler(mask, integral, options)
  if (
    horizontal.lineCenters.length !== rows + 1 ||
    vertical.lineCenters.length !== columns + 1
  ) {
    result.warnings.push(
      TOPOLOGY_WARNING_CODES.internalBoundaryCountMismatch,
    )
    return result
  }

  for (let line = 1; line < rows; line += 1) {
    const center = horizontal.lineCenters[line]
    if (center === undefined) {
      continue
    }
    for (let column = 0; column < columns; column += 1) {
      const xStart = vertical.lineCenters[column]
      const xEnd = vertical.lineCenters[column + 1]
      if (xStart === undefined || xEnd === undefined) {
        continue
      }
      result.horizontal.push({
        from: { row: line - 1, column },
        to: { row: line, column },
        evidence: sampler.horizontal(
          center,
          xStart,
          xEnd,
          horizontal.wallThickness,
          vertical.wallThickness,
        ),
      })
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const yStart = horizontal.lineCenters[row]
    const yEnd = horizontal.lineCenters[row + 1]
    if (yStart === undefined || yEnd === undefined) {
      continue
    }
    for (let line = 1; line < columns; line += 1) {
      const center = vertical.lineCenters[line]
      if (center === undefined) {
        continue
      }
      result.vertical.push({
        from: { row, column: line - 1 },
        to: { row, column: line },
        evidence: sampler.vertical(
          center,
          yStart,
          yEnd,
          vertical.wallThickness,
          horizontal.wallThickness,
        ),
      })
    }
  }

  if (
    result.horizontal.length !== (rows - 1) * columns ||
    result.vertical.length !== rows * (columns - 1)
  ) {
    result.warnings.push(
      TOPOLOGY_WARNING_CODES.internalBoundaryCountMismatch,
    )
  }
  return result
}
