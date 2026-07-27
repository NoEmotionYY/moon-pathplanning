import { createPinia, setActivePinia } from 'pinia'
import { useGridStore } from '@/stores/grid'
import type { DecodedImage } from '@/types/import'
import { RasterImageImportError } from '@/services/import/imageLoader'
import { useRasterImageImport } from './useRasterImageImport'

const file = (name = 'maze.png', type = 'image/png') =>
  new File([new Uint8Array([1])], name, { type })

const decoded = (fileName = 'maze.png'): DecodedImage => ({
  matrix: {
    width: 1,
    height: 1,
    rgba: new Uint8ClampedArray([10, 20, 30, 40]),
  },
  metadata: {
    width: 1,
    height: 1,
    pixels: 1,
    mimeType: 'image/png',
    fileSize: 1,
    fileName,
  },
})

describe('useRasterImageImport 临时状态边界', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('成功读取和关闭清理都不会修改 grid Store', async () => {
    const grid = useGridStore()
    const before = grid.toDocument()
    const state = useRasterImageImport(vi.fn(async () => decoded()))

    expect(await state.selectFile(file())).toBe(true)
    expect(state.decodedImage.value).not.toBeNull()
    state.reset()

    expect(state.selectedFile.value).toBeNull()
    expect(state.decodedImage.value).toBeNull()
    expect(state.transformedImage.value).toBeNull()
    expect(grid.toDocument()).toEqual(before)
  })

  it('解码失败不会修改 grid Store', async () => {
    const grid = useGridStore()
    const before = grid.toDocument()
    const state = useRasterImageImport(vi.fn(async () => {
      throw new RasterImageImportError('IMAGE_DECODE_FAILED', '不是图片')
    }))

    expect(await state.selectFile(file())).toBe(false)
    expect(state.error.value?.code).toBe('IMAGE_DECODE_FAILED')
    expect(grid.toDocument()).toEqual(before)
  })

  it('选择新文件会取消旧任务且只保留新结果', async () => {
    const pending: Array<{
      file: File
      signal?: AbortSignal
      resolve: (value: DecodedImage) => void
      reject: (error: unknown) => void
    }> = []
    const decoder = vi.fn((selected: File, signal?: AbortSignal) =>
      new Promise<DecodedImage>((resolve, reject) => {
        pending.push({ file: selected, signal, resolve, reject })
        signal?.addEventListener('abort', () => reject(
          new RasterImageImportError('IMPORT_CANCELLED', '已取消'),
        ))
      }))
    const state = useRasterImageImport(decoder)
    const first = state.selectFile(file('first.png'))
    await Promise.resolve()
    const second = state.selectFile(file('second.png'))
    await Promise.resolve()

    expect(pending[0]?.signal?.aborted).toBe(true)
    pending[1]?.resolve(decoded('second.png'))
    await Promise.all([first, second])
    expect(state.selectedFile.value?.name).toBe('second.png')
    expect(state.decodedImage.value?.metadata.fileName).toBe('second.png')
  })

  it('SVG/PDF 不调用图片 decoder', async () => {
    const decoder = vi.fn(async () => decoded())
    const state = useRasterImageImport(decoder)
    expect(await state.selectFile(file('maze.svg', 'image/svg+xml'))).toBe(false)
    expect(await state.selectFile(file('maze.pdf', 'application/pdf'))).toBe(false)
    expect(decoder).not.toHaveBeenCalled()
    expect(state.error.value?.code).toBe('FORMAT_NOT_AVAILABLE')
  })

  it('取消读取清除矩阵并保留明确取消状态', async () => {
    const decoder = vi.fn((_file: File, signal?: AbortSignal) =>
      new Promise<DecodedImage>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(
          new RasterImageImportError('IMPORT_CANCELLED', '已取消'),
        ))
      }))
    const state = useRasterImageImport(decoder)
    const pending = state.selectFile(file())
    await Promise.resolve()
    state.cancelDecode()
    await pending
    expect(state.isLoading.value).toBe(false)
    expect(state.decodedImage.value).toBeNull()
    expect(state.error.value?.code).toBe('IMPORT_CANCELLED')
  })
})
