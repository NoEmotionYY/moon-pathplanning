import type { BinaryMask } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import type { MazePassageDefinition } from '@/types/mazeTopology'
import {
  binaryMaskToImageMatrix,
  generateMazeMaskFromPassages,
  generateSpanningMazePassages,
  type GeneratedMazeOptions,
  type OuterOpeningDefinition,
} from './generateOrthogonalMazeMask'

export interface PipelineMazeFixtureOptions {
  rows: number
  columns: number
  wallThickness?: number
  cellWidth?: number
  padding?: number
  openings?: OuterOpeningDefinition[]
  wallColor?: 'dark' | 'light'
  transparentBackground?: boolean
  noisePixels?: number
  missingWallSegments?: number
  passages?: MazePassageDefinition[]
}

export function createPipelineMazeFixture(
  options: PipelineMazeFixtureOptions,
): ImageMatrix {
  const generatedOptions: GeneratedMazeOptions = {
    rows: options.rows,
    columns: options.columns,
    cellWidth: options.cellWidth ?? 12,
    wallThickness: options.wallThickness ?? 1,
    padding: options.padding ?? 8,
    openings: options.openings ?? [
      { side: 'top', cellIndex: 0 },
      { side: 'bottom', cellIndex: options.columns - 1 },
    ],
    noisePixels: options.noisePixels ?? 0,
    missingWallSegments: options.missingWallSegments ?? 0,
    seed: 2026,
  }
  const generated = generateMazeMaskFromPassages(
    generatedOptions,
    options.passages ??
      generateSpanningMazePassages(options.rows, options.columns),
  )
  return binaryMaskToImageMatrix(generated.mask, {
    wallColor: options.wallColor,
    transparentBackground: options.transparentBackground,
  })
}

export function createSolidImage(
  width: number,
  height: number,
  luminance: 0 | 255,
): ImageMatrix {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    rgba[offset] = luminance
    rgba[offset + 1] = luminance
    rgba[offset + 2] = luminance
    rgba[offset + 3] = 255
  }
  return { width, height, rgba }
}

export function createDiagonalImage(
  width = 180,
  height = 160,
): ImageMatrix {
  const mask: BinaryMask = {
    width,
    height,
    values: new Uint8Array(width * height),
  }
  for (let offset = -height; offset < width; offset += 18) {
    for (let y = 0; y < height; y += 1) {
      const x = y + offset
      for (let thickness = 0; thickness < 3; thickness += 1) {
        const targetX = x + thickness
        if (targetX >= 0 && targetX < width) {
          mask.values[y * width + targetX] = 1
        }
      }
    }
  }
  return binaryMaskToImageMatrix(mask)
}

export function createHoneycombImage(
  width = 180,
  height = 160,
): ImageMatrix {
  const mask: BinaryMask = {
    width,
    height,
    values: new Uint8Array(width * height),
  }
  const drawLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let step = 0; step <= steps; step += 1) {
      const ratio = steps === 0 ? 0 : step / steps
      const x = Math.round(x0 + (x1 - x0) * ratio)
      const y = Math.round(y0 + (y1 - y0) * ratio)
      if (x >= 0 && x < width && y >= 0 && y < height) {
        mask.values[y * width + x] = 1
      }
    }
  }
  const radius = 12
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const centerX = 18 + column * 22 + (row % 2) * 11
      const centerY = 16 + row * 20
      const points = Array.from({ length: 6 }, (_, index) => {
        const angle = Math.PI / 3 * index
        return {
          x: Math.round(centerX + Math.cos(angle) * radius),
          y: Math.round(centerY + Math.sin(angle) * radius),
        }
      })
      for (let index = 0; index < points.length; index += 1) {
        const first = points[index]!
        const second = points[(index + 1) % points.length]!
        drawLine(first.x, first.y, second.x, second.y)
      }
    }
  }
  return binaryMaskToImageMatrix(mask)
}
