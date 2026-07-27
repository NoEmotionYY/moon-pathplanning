import type { BinaryMask } from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import type {
  MazeCell,
  MazePassageDefinition,
} from '@/types/mazeTopology'

export interface OuterOpeningDefinition {
  side: 'top' | 'right' | 'bottom' | 'left'
  cellIndex: number
  widthInCells?: number
}

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
  openings?: boolean | OuterOpeningDefinition[]
}

export type GeneratedMazeOptions = OrthogonalMazeMaskOptions

export interface GeneratedMazeFromPassages {
  mask: BinaryMask
  expectedEdges: MazePassageDefinition[]
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

const eraseOuterOpening = (
  mask: BinaryMask,
  options: {
    rows: number
    columns: number
    cellWidth: number
    cellHeight: number
    wallThickness: number
    padding: number
  },
  opening: OuterOpeningDefinition,
): void => {
  const horizontal = opening.side === 'top' || opening.side === 'bottom'
  const cellCount = horizontal ? options.columns : options.rows
  if (cellCount <= 0) {
    return
  }
  const startIndex = Math.max(
    0,
    Math.min(cellCount - 1, opening.cellIndex),
  )
  const requestedWidth = Math.max(
    1,
    Math.floor(opening.widthInCells ?? 1),
  )
  const widthInCells = Math.min(requestedWidth, cellCount - startIndex)
  if (horizontal) {
    const y = opening.side === 'top'
      ? options.padding
      : options.padding + options.rows * options.cellHeight
    fillRectangle(
      mask.values,
      mask.width,
      mask.height,
      options.padding + startIndex * options.cellWidth +
        options.wallThickness,
      y,
      Math.max(
        1,
        widthInCells * options.cellWidth - options.wallThickness,
      ),
      options.wallThickness,
      0,
    )
    return
  }
  const x = opening.side === 'left'
    ? options.padding
    : options.padding + options.columns * options.cellWidth
  fillRectangle(
    mask.values,
    mask.width,
    mask.height,
    x,
    options.padding + startIndex * options.cellHeight +
      options.wallThickness,
    options.wallThickness,
    Math.max(
      1,
      widthInCells * options.cellHeight - options.wallThickness,
    ),
    0,
  )
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
      eraseOuterOpening(
        { width, height, values },
        {
          rows: options.rows,
          columns: options.columns,
          cellWidth,
          cellHeight,
          wallThickness,
          padding,
        },
        opening,
      )
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

const cellIndex = (cell: MazeCell, columns: number): number =>
  cell.row * columns + cell.column

const cellInRange = (
  cell: MazeCell,
  rows: number,
  columns: number,
): boolean =>
  cell.row >= 0 &&
  cell.row < rows &&
  cell.column >= 0 &&
  cell.column < columns

export function generateSpanningMazePassages(
  rows: number,
  columns: number,
  seed = 2026,
): MazePassageDefinition[] {
  const candidates: MazePassageDefinition[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (column + 1 < columns) {
        candidates.push({
          from: { row, column },
          to: { row, column: column + 1 },
        })
      }
      if (row + 1 < rows) {
        candidates.push({
          from: { row, column },
          to: { row: row + 1, column },
        })
      }
    }
  }
  const random = createRandom(seed)
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const current = candidates[index]
    const replacement = candidates[target]
    if (current && replacement) {
      candidates[index] = replacement
      candidates[target] = current
    }
  }
  const parents = Int32Array.from(
    { length: rows * columns },
    (_, index) => index,
  )
  const find = (value: number): number => {
    let root = value
    while ((parents[root] ?? root) !== root) {
      root = parents[root] ?? root
    }
    let current = value
    while ((parents[current] ?? current) !== root) {
      const next = parents[current] ?? root
      parents[current] = root
      current = next
    }
    return root
  }
  const passages: MazePassageDefinition[] = []
  for (const candidate of candidates) {
    const from = find(cellIndex(candidate.from, columns))
    const to = find(cellIndex(candidate.to, columns))
    if (from !== to) {
      parents[to] = from
      passages.push(candidate)
    }
  }
  return passages
}

export function generateMazeMaskFromPassages(
  options: GeneratedMazeOptions,
  passages: MazePassageDefinition[],
): GeneratedMazeFromPassages {
  const cellWidth = options.cellWidth ?? 12
  const cellHeight = options.cellHeight ?? cellWidth
  const wallThickness = options.wallThickness ?? 1
  const padding = options.padding ?? 0
  const mask = generateOrthogonalMazeMask({
    ...options,
    openings: false,
    noiseRatio: 0,
    noisePixels: 0,
    missingSegmentRatio: 0,
    missingWallSegments: 0,
  })
  const expectedEdges: MazePassageDefinition[] = []
  const seen = new Set<number>()

  for (const passage of passages) {
    if (
      !cellInRange(passage.from, options.rows, options.columns) ||
      !cellInRange(passage.to, options.rows, options.columns) ||
      Math.abs(passage.from.row - passage.to.row) +
        Math.abs(passage.from.column - passage.to.column) !== 1
    ) {
      continue
    }
    const fromIndex = cellIndex(passage.from, options.columns)
    const toIndex = cellIndex(passage.to, options.columns)
    const from = fromIndex <= toIndex ? passage.from : passage.to
    const to = fromIndex <= toIndex ? passage.to : passage.from
    const key =
      Math.min(fromIndex, toIndex) * options.rows * options.columns +
      Math.max(fromIndex, toIndex)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    expectedEdges.push({
      from: { ...from },
      to: { ...to },
    })

    if (from.row === to.row) {
      const wallColumn = Math.max(from.column, to.column)
      fillRectangle(
        mask.values,
        mask.width,
        mask.height,
        padding + wallColumn * cellWidth,
        padding + from.row * cellHeight + wallThickness,
        wallThickness,
        Math.max(1, cellHeight - wallThickness),
        0,
      )
    } else {
      const wallRow = Math.max(from.row, to.row)
      fillRectangle(
        mask.values,
        mask.width,
        mask.height,
        padding + from.column * cellWidth + wallThickness,
        padding + wallRow * cellHeight,
        Math.max(1, cellWidth - wallThickness),
        wallThickness,
        0,
      )
    }
  }

  if (Array.isArray(options.openings)) {
    for (const opening of options.openings) {
      eraseOuterOpening(
        mask,
        {
          rows: options.rows,
          columns: options.columns,
          cellWidth,
          cellHeight,
          wallThickness,
          padding,
        },
        opening,
      )
    }
  }

  const random = createRandom(options.seed ?? 12345)
  for (let index = 0; index < (options.missingWallSegments ?? 0); index += 1) {
    const horizontal = index % 2 === 0
    if (horizontal && options.rows > 1) {
      const line = 1 + Math.floor(random() * (options.rows - 1))
      const column = Math.floor(random() * options.columns)
      const damageWidth = Math.max(1, Math.floor(cellWidth / 2))
      fillRectangle(
        mask.values,
        mask.width,
        mask.height,
        padding + column * cellWidth +
          Math.floor((cellWidth - damageWidth) / 2),
        padding + line * cellHeight,
        damageWidth,
        wallThickness,
        0,
      )
    } else if (options.columns > 1) {
      const line = 1 + Math.floor(random() * (options.columns - 1))
      const row = Math.floor(random() * options.rows)
      const damageHeight = Math.max(1, Math.floor(cellHeight / 2))
      fillRectangle(
        mask.values,
        mask.width,
        mask.height,
        padding + line * cellWidth,
        padding + row * cellHeight +
          Math.floor((cellHeight - damageHeight) / 2),
        wallThickness,
        damageHeight,
        0,
      )
    }
  }

  const noiseRatio = Math.max(0, Math.min(1, options.noiseRatio ?? 0))
  const noisePixels = options.noisePixels ??
    Math.floor(mask.values.length * noiseRatio)
  for (let index = 0; index < noisePixels; index += 1) {
    const position = Math.floor(random() * mask.values.length)
    mask.values[position] = mask.values[position] === 1 ? 0 : 1
  }

  expectedEdges.sort((left, right) =>
    cellIndex(left.from, options.columns) -
      cellIndex(right.from, options.columns) ||
    cellIndex(left.to, options.columns) -
      cellIndex(right.to, options.columns),
  )
  return { mask, expectedEdges }
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
