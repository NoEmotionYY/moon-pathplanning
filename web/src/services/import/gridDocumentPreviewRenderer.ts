import type { GridMapDocument } from '@/types/grid'

export interface GridDocumentPreviewColors {
  background: string
  walkable: string
  obstacle: string
  grid: string
  start: string
  goal: string
}

export interface GridDocumentPreviewRenderOptions {
  width: number
  height: number
  devicePixelRatio?: number
  colors: GridDocumentPreviewColors
}

const pointKey = (x: number, y: number): string => `${x}:${y}`

export function renderGridDocumentPreview(
  canvas: HTMLCanvasElement,
  document: GridMapDocument,
  options: GridDocumentPreviewRenderOptions,
): void {
  const width = Math.max(1, options.width)
  const height = Math.max(1, options.height)
  const dpr = Math.max(1, options.devicePixelRatio ?? 1)
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const context = canvas.getContext('2d')
  if (!context) return
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = options.colors.background
  context.fillRect(0, 0, width, height)

  const padding = 12
  const cellSize = Math.max(
    0.1,
    Math.min(
      (width - padding * 2) / document.width,
      (height - padding * 2) / document.height,
    ),
  )
  const drawWidth = document.width * cellSize
  const drawHeight = document.height * cellSize
  const left = (width - drawWidth) / 2
  const top = (height - drawHeight) / 2
  context.imageSmoothingEnabled = false
  context.fillStyle = options.colors.walkable
  context.fillRect(left, top, drawWidth, drawHeight)

  const obstacles = new Set(
    document.obstacles.map(([x, y]) => pointKey(x, y)),
  )
  context.fillStyle = options.colors.obstacle
  for (let y = 0; y < document.height; y += 1) {
    let runStart = -1
    for (let x = 0; x <= document.width; x += 1) {
      const blocked =
        x < document.width && obstacles.has(pointKey(x, y))
      if (blocked && runStart < 0) runStart = x
      if (!blocked && runStart >= 0) {
        context.fillRect(
          left + runStart * cellSize,
          top + y * cellSize,
          (x - runStart) * cellSize,
          cellSize,
        )
        runStart = -1
      }
    }
  }

  if (cellSize >= 4) {
    context.strokeStyle = options.colors.grid
    context.lineWidth = 1
    context.beginPath()
    for (let x = 0; x <= document.width; x += 1) {
      const position = left + x * cellSize
      context.moveTo(position, top)
      context.lineTo(position, top + drawHeight)
    }
    for (let y = 0; y <= document.height; y += 1) {
      const position = top + y * cellSize
      context.moveTo(left, position)
      context.lineTo(left + drawWidth, position)
    }
    context.stroke()
  }

  const drawMarker = (
    point: readonly [number, number],
    color: string,
  ) => {
    context.fillStyle = color
    context.beginPath()
    context.arc(
      left + (point[0] + 0.5) * cellSize,
      top + (point[1] + 0.5) * cellSize,
      Math.max(2.5, cellSize * 0.34),
      0,
      Math.PI * 2,
    )
    context.fill()
  }
  drawMarker(document.start, options.colors.start)
  drawMarker(document.goal, options.colors.goal)
}
