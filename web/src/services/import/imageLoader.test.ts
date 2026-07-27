import { IMPORT_IMAGE_LIMITS } from '@/config/importLimits'
import {
  decodeRasterImage,
  RasterImageImportError,
} from './imageLoader'

class MockOffscreenCanvas {
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  getContext() {
    return {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(this.width * this.height * 4).fill(127),
      })),
    }
  }
}

const rasterFile = (
  name = 'maze.png',
  type = 'image/png',
): File => new File([new Uint8Array([1, 2, 3])], name, { type })

describe('decodeRasterImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('优先使用 createImageBitmap 并在成功后关闭资源', async () => {
    const close = vi.fn()
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 2,
      height: 1,
      close,
    })))

    const result = await decodeRasterImage(rasterFile())
    expect(result.metadata).toMatchObject({
      width: 2,
      height: 1,
      pixels: 2,
      mimeType: 'image/png',
      fileName: 'maze.png',
    })
    expect(result.matrix.rgba).toHaveLength(8)
    expect(close).toHaveBeenCalledOnce()
  })

  it('像素读取失败时仍关闭 ImageBitmap', async () => {
    const close = vi.fn()
    class BrokenCanvas extends MockOffscreenCanvas {
      override getContext() {
        return {
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          getImageData: vi.fn(() => {
            throw new Error('blocked')
          }),
        }
      }
    }
    vi.stubGlobal('OffscreenCanvas', BrokenCanvas)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 2,
      height: 1,
      close,
    })))

    await expect(decodeRasterImage(rasterFile())).rejects.toMatchObject({
      code: 'PIXEL_READ_FAILED',
    })
    expect(close).toHaveBeenCalledOnce()
  })

  it('解码过程中取消会返回 IMPORT_CANCELLED 并关闭位图', async () => {
    const close = vi.fn()
    let resolveBitmap = (_bitmap: ImageBitmap): void => {
      throw new Error('createImageBitmap promise was not initialized')
    }
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
    vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise<ImageBitmap>((resolve) => {
      resolveBitmap = resolve
    })))
    const controller = new AbortController()
    const pending = decodeRasterImage(rasterFile(), controller.signal)
    controller.abort()
    resolveBitmap({ width: 2, height: 1, close } as ImageBitmap)

    await expect(pending).rejects.toMatchObject({ code: 'IMPORT_CANCELLED' })
    expect(close).toHaveBeenCalledOnce()
  })

  it('拒绝真实宽高或像素超过解码限制的图片', async () => {
    const close = vi.fn()
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: IMPORT_IMAGE_LIMITS.maxWidth + 1,
      height: 1,
      close,
    })))
    await expect(decodeRasterImage(rasterFile())).rejects.toMatchObject({
      code: 'IMAGE_DIMENSIONS_EXCEEDED',
    })
    expect(close).toHaveBeenCalledOnce()
  })

  it('宽高分别合法但总像素超限时拒绝图片', async () => {
    const close = vi.fn()
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 8_000,
      height: 5_000,
      close,
    })))

    await expect(decodeRasterImage(rasterFile())).rejects.toMatchObject({
      code: 'IMAGE_PIXELS_EXCEEDED',
    })
    expect(close).toHaveBeenCalledOnce()
  })

  it('伪装成 PNG 的文本内容返回明确解码错误', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      throw new Error('invalid image')
    }))
    await expect(decodeRasterImage(new File(
      ['not a png'],
      'fake.png',
      { type: 'image/png' },
    ))).rejects.toMatchObject({
      code: 'IMAGE_DECODE_FAILED',
    })
  })

  it('createImageBitmap 不可用时使用 Object URL，并始终释放 URL', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
    const createObjectURL = vi.fn(() => 'blob:maze')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 2
      naturalHeight = 1
      width = 2
      height = 1
      private source = ''

      set src(value: string) {
        this.source = value
        if (value) queueMicrotask(() => this.onload?.())
      }

      get src() {
        return this.source
      }
    }
    vi.stubGlobal('Image', MockImage)

    const result = await decodeRasterImage(rasterFile())
    expect(result.metadata.width).toBe(2)
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:maze')
  })

  it('HTMLImageElement 回退解码失败时也释放 Object URL', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:broken-maze'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    class BrokenImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(value: string) {
        if (value) queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', BrokenImage)

    await expect(decodeRasterImage(rasterFile())).rejects.toMatchObject({
      code: 'IMAGE_DECODE_FAILED',
    })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken-maze')
  })

  it('SVG 和 PDF 不进入栅格解码', async () => {
    const createBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createBitmap)
    await expect(decodeRasterImage(rasterFile(
      'maze.svg',
      'image/svg+xml',
    ))).rejects.toBeInstanceOf(RasterImageImportError)
    expect(createBitmap).not.toHaveBeenCalled()
  })
})
