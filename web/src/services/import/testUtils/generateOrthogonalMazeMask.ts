import type { BinaryMask } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'

export interface OrthogonalMazeMaskOptions {
  rows: number
  columns: number
  cellWidth?: number
  cellHeight?: number
  wallThickness?: number
  padding?: number
  seed?: number
  noiseRatio?: number
  noisePixels?: number
  missingSegmentRatio?: number
  missingWallSegments?: number
  openings?: boolean | Array<{
    side: 'top' | 'right' | 'bottom' | 'left'
    cellIndex: number
  }>
}

const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

const fillRectangle = (
  values: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  rectangleWidth: number,
  rectangleHeight: number,
  value: 0 | 1,
): void => {
  const startX = Math.max(0, x)
  const startY = Math.max(0, y)
  const endX = Math.min(width, x + rectangleWidth)
  const endY = Math.min(height, y + rectangleHeight)
  for (let row = startY; row < endY; row += 1) {
    values.fill(value, row * width + startX, row * width + endX)
  }
}

export function generateOrthogonalMazeMask(
  options: OrthogonalMazeMaskOptions,
): BinaryMask {
  const cellWidth = options.cellWidth ?? 12
  const cellHeight = options.cellHeight ?? cellWidth
  const wallThickness = options.wallThickness ?? 1
  const padding = options.padding ?? 0
  const width = options.columns * cellWidth + wallThickness + padding * 2
  const height = options.rows * cellHeight + wallThickness + padding * 2
  const values = new Uint8Array(width * height)
  const random = createRandom(options.seed ?? 12345)
  const openings = Array.isArray(options.openings)
    ? true
    : (options.openings ?? true)
  const missingSegmentRatio = options.missingSegmentRatio ?? 0

  for (let line = 0; line <= options.rows; line += 1) {
    const y = padding + line * cellHeight
    fillRectangle(
      values,
      width,
      height,
      padding,
      y,
      options.columns * cellWidth + wallThickness,
      wallThickness,
      1,
    )
    if (line > 0 && line < options.rows) {
      for (let column = 0; column < options.columns; column += 1) {
        const shouldOpen = openings && (line + column) % 3 === 1
        const shouldRemove = random() < missingSegmentRatio
        if (shouldOpen || shouldRemove) {
          const openingWidth = shouldRemove
            ? Math.max(1, cellWidth - wallThickness)
            : Math.max(1, Math.floor(cellWidth / 3))
          const x = padding + column * cellWidth +
            Math.floor((cellWidth - openingWidth) / 2)
          fillRectangle(
            values,
            width,
            height,
            x,
            y,
            openingWidth,
            wallThickness,
            0,
          )
        }
      }
    }
  }

  for (let line = 0; line <= options.columns; line += 1) {
    const x = padding + line * cellWidth
    fillRectangle(
      values,
      width,
      height,
      x,
      padding,
      wallThickness,
      options.rows * cellHeight + wallThickness,
      1,
    )
    if (line > 0 && line < options.columns) {
      for (let row = 0; row < options.rows; row += 1) {
        const shouldOpen = openings && (line * 2 + row) % 4 === 1
        const shouldRemove = random() < missingSegmentRatio
        if (shouldOpen || shouldRemove) {
          const openingHeight = shouldRemove
            ? Math.max(1, cellHeight - wallThickness)
            : Math.max(1, Math.floor(cellHeight / 3))
          const y = padding + row * cellHeight +
            Math.floor((cellHeight - openingHeight) / 2)
          fillRectangle(
            values,
            width,
            height,
            x,
            y,
            wallThickness,
            openingHeight,
            0,
          )
        }
      }
    }
  }

  for (let index = 0; index < (options.missingWallSegments ?? 0); index += 1) {
    const horizontal = index % 2 === 0
    if (horizontal && options.rows > 1) {
      const line = 1 + Math.floor(random() * (options.rows - 1))
      const column = Math.floor(random() * options.columns)
      fillRectangle(
        values,
        width,
        height,
        padding + column * cellWidth + wallThickness,
        padding + line * cellHeight,
        Math.max(1, cellWidth - wallThickness),
        wallThickness,
        0,
      )
    } else if (options.columns > 1) {
      const line = 1 + Math.floor(random() * (options.columns - 1))
      const row = Math.floor(random() * options.rows)
      fillRectangle(
        values,
        width,
        height,
        padding + line * cellWidth,
        padding + row * cellHeight + wallThickness,
        wallThickness,
        Math.max(1, cellHeight - wallThickness),
        0,
      )
    }
  }

  if (Array.isArray(options.openings)) {
    for (const opening of options.openings) {
      const horizontal = opening.side === 'top' || opening.side === 'bottom'
      const cellSize = horizontal ? cellWidth : cellHeight
      const cellCount = horizontal ? options.columns : options.rows
      const cellIndex = Math.max(0, Math.min(cellCount - 1, opening.cellIndex))
      const openingSize = Math.max(1, Math.floor(cellSize / 3))
      const along = padding + cellIndex * cellSize +
        Math.floor((cellSize - openingSize) / 2)
      if (opening.side === 'top' || opening.side === 'bottom') {
        const y = opening.side === 'top'
          ? padding
          : padding + options.rows * cellHeight
        fillRectangle(
          values,
          width,
          height,
          along,
          y,
          openingSize,
          wallThickness,
          0,
        )
      } else {
        const x = opening.side === 'left'
          ? padding
          : padding + options.columns * cellWidth
        fillRectangle(
          values,
          width,
          height,
          x,
          along,
          wallThickness,
          openingSize,
          0,
        )
      }
    }
  }

  const noiseRatio = Math.max(0, Math.min(1, options.noiseRatio ?? 0))
  const noisePixels = options.noisePixels ??
    Math.floor(values.length * noiseRatio)
  for (let index = 0; index < noisePixels; index += 1) {
    const position = Math.floor(random() * values.length)
    values[position] = values[position] === 1 ? 0 : 1
  }

  return { width, height, values }
}

export function binaryMaskToImageMatrix(
  mask: BinaryMask,
  options: {
    wallColor?: 'dark' | 'light'
    transparentBackground?: boolean
  } = {},
): ImageMatrix {
  const wallColor = options.wallColor ?? 'dark'
  const wallLuminance = wallColor === 'dark' ? 0 : 255
  const backgroundLuminance = wallColor === 'dark' ? 255 : 0
  const rgba = new Uint8ClampedArray(mask.values.length * 4)
  for (let index = 0; index < mask.values.length; index += 1) {
    const isWall = mask.values[index] === 1
    const luminance = isWall ? wallLuminance : backgroundLuminance
    const rgbaIndex = index * 4
    rgba[rgbaIndex] = luminance
    rgba[rgbaIndex + 1] = luminance
    rgba[rgbaIndex + 2] = luminance
    rgba[rgbaIndex + 3] =
      options.transparentBackground && !isWall ? 0 : 255
  }
  return { width: mask.width, height: mask.height, rgba }
}
