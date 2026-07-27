import type { BinaryMask, GrayscaleImage } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'

export type RgbaTuple = readonly [number, number, number, number?]

export const createImage = (
  width: number,
  height: number,
  pixel: (x: number, y: number) => RgbaTuple,
): ImageMatrix => {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixel(x, y)
      const offset = (y * width + x) * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = color[3] ?? 255
    }
  }
  return { width, height, rgba }
}

export const createSolidImage = (
  width: number,
  height: number,
  color: RgbaTuple,
): ImageMatrix => createImage(width, height, () => color)

export const createRectangularMaze = (options: {
  width?: number
  height?: number
  margin?: number
  background?: RgbaTuple
  wall?: RgbaTuple
} = {}): ImageMatrix => {
  const width = options.width ?? 24
  const height = options.height ?? 18
  const margin = options.margin ?? 3
  const background = options.background ?? [245, 245, 245, 255]
  const wall = options.wall ?? [20, 20, 20, 255]
  const left = margin
  const right = width - margin - 1
  const top = margin
  const bottom = height - margin - 1
  const entrance = Math.floor((left + right) / 2)

  return createImage(width, height, (x, y) => {
    const outer =
      (y === top && x >= left && x <= right && x !== entrance) ||
      (y === bottom && x >= left && x <= right) ||
      (x === left && y >= top && y <= bottom) ||
      (x === right && y >= top && y <= bottom)
    const innerVertical =
      x === entrance && y >= top + 3 && y <= bottom - 2
    const innerHorizontal =
      y === Math.floor((top + bottom) / 2) &&
      x >= left + 3 &&
      x <= right - 2
    return outer || innerVertical || innerHorizontal ? wall : background
  })
}

export const grayscaleFromRows = (rows: number[][]): GrayscaleImage => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  values: Uint8Array.from(rows.flat()),
  warnings: [],
})

export const maskFromRows = (rows: number[][]): BinaryMask => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  values: Uint8Array.from(rows.flat()),
})
