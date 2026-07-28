import { describe, expect, it } from 'vitest'
import { minimalSparseGridDocument } from './__fixtures__/sparseGridDocuments'
import { readSparseGridFile } from './readSparseGridFile'

const fileOf = (
  name: string,
  type = 'application/json',
  content = JSON.stringify(minimalSparseGridDocument()),
): File => ({
  name,
  type,
  size: new TextEncoder().encode(content).byteLength,
  text: () => Promise.resolve(content),
} as File)

describe('readSparseGridFile', () => {
  it.each([
    ['map.sparse-grid.json', ''],
    ['map.sgrid.json', 'application/octet-stream'],
    ['map.json', 'application/json'],
    ['map.data', 'text/json'],
  ])('reads supported file %s with MIME %s', async (name, type) => {
    const result = await readSparseGridFile(fileOf(name, type))
    expect(result.metadata).toMatchObject({
      fileName: name,
      obstacleCount: 2,
      terrainCount: 1,
      chunkCount: 3,
    })
    expect(result.world.worldVersion).toBe(0)
  })

  it('rejects an unsupported extension and MIME combination', async () => {
    await expect(readSparseGridFile(fileOf('map.txt', 'text/plain'))).rejects.toMatchObject({
      code: 'SPARSE_MAP_FILE_TYPE_UNSUPPORTED',
    })
  })

  it('rejects oversized files before reading', async () => {
    const file = {
      name: 'large.json',
      type: 'application/json',
      size: 16 * 1024 * 1024 + 1,
      text: () => Promise.resolve('{}'),
    } as File
    await expect(readSparseGridFile(file)).rejects.toMatchObject({
      code: 'SPARSE_MAP_FILE_TOO_LARGE',
    })
  })

  it('maps file read failures to a stable error', async () => {
    const file = {
      name: 'broken.json',
      type: 'application/json',
      size: 10,
      text: () => Promise.reject(new Error('disk failed')),
    } as File
    await expect(readSparseGridFile(file)).rejects.toMatchObject({
      code: 'SPARSE_MAP_FILE_READ_FAILED',
    })
  })

  it('honors AbortSignal before reading', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(readSparseGridFile(fileOf('map.json'), { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' })
  })

  it('honors AbortSignal after reading', async () => {
    const controller = new AbortController()
    const file = fileOf('map.json')
    file.text = async () => {
      controller.abort()
      return JSON.stringify(minimalSparseGridDocument())
    }
    await expect(readSparseGridFile(file, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects ordinary grid.v1 JSON by format', async () => {
    const file = fileOf('map.json', 'application/json', JSON.stringify({
      format: 'moon-pathplanning.grid.v1',
    }))
    await expect(readSparseGridFile(file)).rejects.toMatchObject({
      code: 'SPARSE_MAP_FORMAT_UNSUPPORTED',
    })
  })
})
