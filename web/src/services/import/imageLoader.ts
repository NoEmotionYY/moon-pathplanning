import { IMPORT_IMAGE_LIMITS } from '@/config/importLimits'
import type {
  DecodedImage,
  ImageMatrix,
  MazeSourceFileType,
} from '@/types/import'
import { validateImportFile } from './importValidation'

export type RasterImageErrorCode =
  | 'IMPORT_CANCELLED'
  | 'RASTER_TYPE_REQUIRED'
  | 'IMAGE_DECODE_FAILED'
  | 'IMAGE_DIMENSIONS_EXCEEDED'
  | 'IMAGE_PIXELS_EXCEEDED'
  | 'CANVAS_UNAVAILABLE'
  | 'PIXEL_READ_FAILED'

export class RasterImageImportError extends Error {
  constructor(
    public readonly code: RasterImageErrorCode | string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'RasterImageImportError'
  }
}

const RASTER_TYPES = new Set<MazeSourceFileType>(['png', 'jpeg', 'webp'])
const MIME_BY_TYPE: Readonly<Partial<Record<MazeSourceFileType, string>>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

type DrawableImage = ImageBitmap | HTMLImageElement
type PixelCanvas = OffscreenCanvas | HTMLCanvasElement
type PixelContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

const cancelledError = (): RasterImageImportError =>
  new RasterImageImportError('IMPORT_CANCELLED', '图片读取已取消。')

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw cancelledError()
}

const createPixelCanvas = (width: number, height: number): PixelCanvas => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }
  throw new RasterImageImportError(
    'CANVAS_UNAVAILABLE',
    '当前环境无法创建图片解码 Canvas。',
  )
}

const validateDecodedDimensions = (width: number, height: number): number => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RasterImageImportError(
      'IMAGE_DECODE_FAILED',
      '文件不是有效的栅格图片，或图片尺寸无法读取。',
    )
  }
  if (width > IMPORT_IMAGE_LIMITS.maxWidth || height > IMPORT_IMAGE_LIMITS.maxHeight) {
    throw new RasterImageImportError(
      'IMAGE_DIMENSIONS_EXCEEDED',
      `图片宽高不能超过 ${IMPORT_IMAGE_LIMITS.maxWidth}×${IMPORT_IMAGE_LIMITS.maxHeight}。`,
    )
  }
  const pixels = width * height
  if (pixels > IMPORT_IMAGE_LIMITS.maxPixels) {
    throw new RasterImageImportError(
      'IMAGE_PIXELS_EXCEEDED',
      `图片总像素不能超过 ${IMPORT_IMAGE_LIMITS.maxPixels.toLocaleString()}。`,
    )
  }
  return pixels
}

const readImageMatrix = (
  source: DrawableImage,
  width: number,
  height: number,
): ImageMatrix => {
  const canvas = createPixelCanvas(width, height)
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  }) as PixelContext | null
  if (!context) {
    throw new RasterImageImportError(
      'CANVAS_UNAVAILABLE',
      '无法创建图片像素读取上下文。',
    )
  }
  try {
    context.clearRect(0, 0, width, height)
    context.drawImage(source, 0, 0, width, height)
    const data = context.getImageData(0, 0, width, height).data
    return {
      width,
      height,
      rgba: new Uint8ClampedArray(data),
    }
  } catch (error) {
    if (error instanceof RasterImageImportError) throw error
    throw new RasterImageImportError(
      'PIXEL_READ_FAILED',
      '图片已解码，但无法安全读取像素数据。',
      { cause: error },
    )
  }
}

const loadHtmlImage = (
  objectUrl: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    let settled = false

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', abort)
    }
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const abort = () => {
      finish(() => {
        image.src = ''
        reject(cancelledError())
      })
    }

    image.onload = () => finish(() => resolve(image))
    image.onerror = () => finish(() => reject(new RasterImageImportError(
      'IMAGE_DECODE_FAILED',
      '文件扩展名有效，但内容不是可解码的图片。',
    )))
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) {
      abort()
      return
    }
    image.src = objectUrl
  })

const decodeWithHtmlImage = async (
  file: File,
  signal?: AbortSignal,
): Promise<{ matrix: ImageMatrix; width: number; height: number }> => {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadHtmlImage(objectUrl, signal)
    throwIfAborted(signal)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    validateDecodedDimensions(width, height)
    return {
      matrix: readImageMatrix(image, width, height),
      width,
      height,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const decodeWithImageBitmap = async (
  file: File,
  signal?: AbortSignal,
): Promise<{ matrix: ImageMatrix; width: number; height: number }> => {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    throwIfAborted(signal)
    validateDecodedDimensions(bitmap.width, bitmap.height)
    return {
      matrix: readImageMatrix(bitmap, bitmap.width, bitmap.height),
      width: bitmap.width,
      height: bitmap.height,
    }
  } catch (error) {
    if (error instanceof RasterImageImportError) throw error
    throw new RasterImageImportError(
      'IMAGE_DECODE_FAILED',
      '文件扩展名有效，但内容不是可解码的图片。',
      { cause: error },
    )
  } finally {
    bitmap?.close()
  }
}

export const isImportCancelledError = (error: unknown): boolean =>
  error instanceof RasterImageImportError && error.code === 'IMPORT_CANCELLED'

export async function decodeRasterImage(
  file: File,
  signal?: AbortSignal,
): Promise<DecodedImage> {
  throwIfAborted(signal)
  const validation = validateImportFile(file)
  if (!validation.valid) {
    throw new RasterImageImportError(
      validation.error?.code ?? 'IMAGE_DECODE_FAILED',
      validation.error?.message ?? '图片文件校验失败。',
    )
  }
  if (!RASTER_TYPES.has(validation.fileType)) {
    throw new RasterImageImportError(
      'RASTER_TYPE_REQUIRED',
      validation.fileType === 'svg' || validation.fileType === 'pdf'
        ? 'SVG 和 PDF 将在后续阶段支持，本阶段不会解码。'
        : '请选择 PNG、JPG、JPEG 或 WebP 图片。',
    )
  }

  const decoded = typeof globalThis.createImageBitmap === 'function'
    ? await decodeWithImageBitmap(file, signal)
    : await decodeWithHtmlImage(file, signal)
  throwIfAborted(signal)
  const pixels = validateDecodedDimensions(decoded.width, decoded.height)

  return {
    matrix: decoded.matrix,
    metadata: {
      width: decoded.width,
      height: decoded.height,
      pixels,
      mimeType: MIME_BY_TYPE[validation.fileType] ?? file.type,
      fileSize: file.size,
      fileName: file.name,
    },
  }
}
