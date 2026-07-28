import type {
  EntranceCandidateSummary,
  MazeImportPreviewData,
} from '@/types/mazeImportWorker'
import type { PassageState } from '@/types/mazeTopology'

export interface MazeDetectionPreviewColors {
  background: string
  wall: string
  grid: string
  open: string
  uncertain: string
  entrance: string
  start: string
  goal: string
}

export interface MazeDetectionPreviewRenderOptions {
  width: number
  height: number
  devicePixelRatio?: number
  selectedCandidateIds?: [string, string] | null
  colors: MazeDetectionPreviewColors
}

interface Viewport {
  left: number
  top: number
  scale: number
}

const finitePositive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback

const prepareCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): CanvasRenderingContext2D | null => {
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const context = canvas.getContext('2d')
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return context
}

const viewportFor = (
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): Viewport => {
  const padding = 14
  const scale = Math.max(
    0.01,
    Math.min(
      (width - padding * 2) / sourceWidth,
      (height - padding * 2) / sourceHeight,
    ),
  )
  return {
    scale,
    left: (width - sourceWidth * scale) / 2,
    top: (height - sourceHeight * scale) / 2,
  }
}

const stateColor = (
  state: PassageState,
  colors: MazeDetectionPreviewColors,
): string =>
  state === 'open'
    ? colors.open
    : state === 'uncertain'
      ? colors.uncertain
      : colors.wall

const drawMaskRuns = (
  context: CanvasRenderingContext2D,
  preview: MazeImportPreviewData,
  viewport: Viewport,
  color: string,
): void => {
  const mask = preview.croppedMask
  if (!mask) return
  context.fillStyle = color
  for (let y = 0; y < mask.height; y += 1) {
    let runStart = -1
    for (let x = 0; x <= mask.width; x += 1) {
      const wall = x < mask.width && mask.values[y * mask.width + x] === 1
      if (wall && runStart < 0) runStart = x
      if (!wall && runStart >= 0) {
        context.fillRect(
          viewport.left + runStart * viewport.scale,
          viewport.top + y * viewport.scale,
          Math.max(1, (x - runStart) * viewport.scale),
          Math.max(1, viewport.scale),
        )
        runStart = -1
      }
    }
  }
}

const coordinateAt = (
  centers: readonly number[],
  index: number,
  fallbackLength: number,
): number =>
  centers[index] ??
  (fallbackLength * index) / Math.max(1, centers.length - 1)

const drawCandidate = (
  context: CanvasRenderingContext2D,
  candidate: EntranceCandidateSummary,
  preview: MazeImportPreviewData,
  viewport: Viewport,
  colors: MazeDetectionPreviewColors,
  selectedIds: [string, string] | null,
): void => {
  const mask = preview.croppedMask
  if (!mask) return
  const vertical = preview.verticalLineCenters
  const horizontal = preview.horizontalLineCenters
  const isHorizontal = candidate.side === 'top' || candidate.side === 'bottom'
  const length = isHorizontal ? mask.width : mask.height
  const centers = isHorizontal ? vertical : horizontal
  const start = coordinateAt(centers, candidate.startIndex, length)
  const end = coordinateAt(centers, candidate.endIndex + 1, length)
  const edge = candidate.side === 'top' || candidate.side === 'left'
    ? 0
    : isHorizontal
      ? mask.height
      : mask.width
  const x1 = isHorizontal ? start : edge
  const y1 = isHorizontal ? edge : start
  const x2 = isHorizontal ? end : edge
  const y2 = isHorizontal ? edge : end
  const selectedIndex = selectedIds?.indexOf(candidate.id) ?? -1

  context.save()
  context.lineCap = 'round'
  context.lineWidth = selectedIndex >= 0 ? 5 : 3
  context.strokeStyle = selectedIndex === 0
    ? colors.start
    : selectedIndex === 1
      ? colors.goal
      : colors.entrance
  context.beginPath()
  context.moveTo(
    viewport.left + x1 * viewport.scale,
    viewport.top + y1 * viewport.scale,
  )
  context.lineTo(
    viewport.left + x2 * viewport.scale,
    viewport.top + y2 * viewport.scale,
  )
  context.stroke()
  context.restore()
}

export function renderMazeDetectionPreview(
  canvas: HTMLCanvasElement,
  preview: MazeImportPreviewData,
  options: MazeDetectionPreviewRenderOptions,
): void {
  const width = finitePositive(options.width, 320)
  const height = finitePositive(options.height, 320)
  const dpr = finitePositive(options.devicePixelRatio ?? 1, 1)
  const context = prepareCanvas(canvas, width, height, dpr)
  if (!context) return
  context.clearRect(0, 0, width, height)
  context.fillStyle = options.colors.background
  context.fillRect(0, 0, width, height)
  const mask = preview.croppedMask
  if (!mask) return
  const viewport = viewportFor(mask.width, mask.height, width, height)
  drawMaskRuns(context, preview, viewport, options.colors.wall)

  context.save()
  context.lineWidth = 1
  context.strokeStyle = options.colors.grid
  for (const x of preview.verticalLineCenters) {
    context.beginPath()
    context.moveTo(viewport.left + x * viewport.scale, viewport.top)
    context.lineTo(
      viewport.left + x * viewport.scale,
      viewport.top + mask.height * viewport.scale,
    )
    context.stroke()
  }
  for (const y of preview.horizontalLineCenters) {
    context.beginPath()
    context.moveTo(viewport.left, viewport.top + y * viewport.scale)
    context.lineTo(
      viewport.left + mask.width * viewport.scale,
      viewport.top + y * viewport.scale,
    )
    context.stroke()
  }

  const vertical = preview.verticalLineCenters
  const horizontal = preview.horizontalLineCenters
  const drawBoundary = (
    fromRow: number,
    fromColumn: number,
    toRow: number,
    toColumn: number,
    state: PassageState,
  ) => {
    const crossesRows = fromRow !== toRow
    const x1 = crossesRows
      ? coordinateAt(vertical, fromColumn, mask.width)
      : coordinateAt(vertical, Math.max(fromColumn, toColumn), mask.width)
    const x2 = crossesRows
      ? coordinateAt(vertical, fromColumn + 1, mask.width)
      : x1
    const y1 = crossesRows
      ? coordinateAt(horizontal, Math.max(fromRow, toRow), mask.height)
      : coordinateAt(horizontal, fromRow, mask.height)
    const y2 = crossesRows
      ? y1
      : coordinateAt(horizontal, fromRow + 1, mask.height)
    context.save()
    context.strokeStyle = stateColor(state, options.colors)
    context.lineWidth = state === 'uncertain' ? 2 : 3
    context.setLineDash(state === 'uncertain' ? [5, 4] : [])
    context.beginPath()
    context.moveTo(
      viewport.left + x1 * viewport.scale,
      viewport.top + y1 * viewport.scale,
    )
    context.lineTo(
      viewport.left + x2 * viewport.scale,
      viewport.top + y2 * viewport.scale,
    )
    context.stroke()
    context.restore()
  }
  for (const boundary of [
    ...preview.horizontalBoundaries,
    ...preview.verticalBoundaries,
  ]) {
    drawBoundary(
      boundary.from.row,
      boundary.from.column,
      boundary.to.row,
      boundary.to.column,
      boundary.state,
    )
  }

  for (const boundary of preview.outerBoundaries) {
    const isHorizontal =
      boundary.side === 'top' || boundary.side === 'bottom'
    const start = isHorizontal
      ? coordinateAt(vertical, boundary.cell.column, mask.width)
      : coordinateAt(horizontal, boundary.cell.row, mask.height)
    const end = isHorizontal
      ? coordinateAt(vertical, boundary.cell.column + 1, mask.width)
      : coordinateAt(horizontal, boundary.cell.row + 1, mask.height)
    const edge = boundary.side === 'top' || boundary.side === 'left'
      ? 0
      : isHorizontal
        ? mask.height
        : mask.width
    context.save()
    context.strokeStyle = stateColor(boundary.state, options.colors)
    context.lineWidth = boundary.state === 'uncertain' ? 2 : 3
    context.setLineDash(
      boundary.state === 'uncertain' ? [5, 4] : [],
    )
    context.beginPath()
    context.moveTo(
      viewport.left + (isHorizontal ? start : edge) * viewport.scale,
      viewport.top + (isHorizontal ? edge : start) * viewport.scale,
    )
    context.lineTo(
      viewport.left + (isHorizontal ? end : edge) * viewport.scale,
      viewport.top + (isHorizontal ? edge : end) * viewport.scale,
    )
    context.stroke()
    context.restore()
  }
  context.restore()

  for (const candidate of preview.entranceCandidates) {
    drawCandidate(
      context,
      candidate,
      preview,
      viewport,
      options.colors,
      options.selectedCandidateIds ?? null,
    )
  }
}
