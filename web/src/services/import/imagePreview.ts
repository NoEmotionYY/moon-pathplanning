import type { ImageMatrix } from '@/types/import'

export interface PreviewDrawOptions {
  maxWidth?: number
  maxHeight?: number
  devicePixelRatio?: number
  checkerSize?: number
  checkerLight?: string
  checkerDark?: string
}

type PreviewSourceCanvas = OffscreenCanvas | HTMLCanvasElement

const createSourceCanvas = (
  width: number,
  height: number,
): PreviewSourceCanvas => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const createSourceImage = (image: ImageMatrix): PreviewSourceCanvas => {
  const canvas = createSourceCanvas(image.width, image.height)
  const context = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null
  if (!context) throw new Error('无法创建预览源 Canvas')
  const imageData = context.createImageData(image.width, image.height)
  imageData.data.set(image.rgba)
  context.putImageData(imageData, 0, 0)
  return canvas
}

export const drawImageMatrixToCanvas = (
  canvas: HTMLCanvasElement,
  image: ImageMatrix,
  options: PreviewDrawOptions = {},
): void => {
  const maxWidth = Math.max(1, options.maxWidth ?? canvas.clientWidth ?? image.width)
  const maxHeight = Math.max(1, options.maxHeight ?? 520)
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const displayWidth = Math.max(1, Math.round(image.width * scale))
  const displayHeight = Math.max(1, Math.round(image.height * scale))
  const pixelRatio = Math.max(1, options.devicePixelRatio ?? window.devicePixelRatio ?? 1)

  canvas.width = Math.round(displayWidth * pixelRatio)
  canvas.height = Math.round(displayHeight * pixelRatio)
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`

  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建预览 Canvas')
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const checkerSize = Math.max(4, options.checkerSize ?? 12)
  const checkerLight = options.checkerLight ?? '#dbe4ee'
  const checkerDark = options.checkerDark ?? '#aebdcb'
  for (let y = 0; y < displayHeight; y += checkerSize) {
    for (let x = 0; x < displayWidth; x += checkerSize) {
      context.fillStyle = ((x / checkerSize + y / checkerSize) % 2 === 0)
        ? checkerLight
        : checkerDark
      context.fillRect(x, y, checkerSize, checkerSize)
    }
  }

  const source = createSourceImage(image)
  context.imageSmoothingEnabled = true
  context.drawImage(
    source,
    0,
    0,
    image.width,
    image.height,
    0,
    0,
    displayWidth,
    displayHeight,
  )
}
