import { SPARSE_MAP_IMPORT_LIMITS } from '@/config/worldGrid'
import type { SparseGridDocument } from '@/types/sparseGridDocument'
import type { WorldBounds } from '@/types/worldGrid'
import type { SparseGridWorld } from '@/services/world/SparseGridWorld'
import { sparseGridDocumentToWorld } from '@/services/world/sparseGridDocumentAdapter'
import { getSparseGridWorldMetrics } from '@/services/world/sparseWorldMetrics'
import { sparseDocumentError } from './sparseGridDocumentError'
import { parseSparseGridJson } from './sparseGridJson'

export interface ReadSparseGridFileOptions {
  readonly signal?: AbortSignal
}

const allowedMimeTypes = new Set([
  '',
  'application/json',
  'text/json',
  'application/octet-stream',
])

const hasAllowedExtension = (name: string): boolean =>
  name.toLowerCase().endsWith('.sparse-grid.json') ||
  name.toLowerCase().endsWith('.sgrid.json') ||
  name.toLowerCase().endsWith('.json')

export async function readSparseGridFile(
  file: File,
  options: ReadSparseGridFileOptions = {},
): Promise<{
  document: SparseGridDocument
  world: SparseGridWorld
  metadata: {
    fileName: string
    fileSize: number
    obstacleCount: number
    terrainCount: number
    chunkCount: number
    contentBounds: WorldBounds
  }
}> {
  if (!hasAllowedExtension(file.name) && !allowedMimeTypes.has(file.type)) {
    throw sparseDocumentError('SPARSE_MAP_FILE_TYPE_UNSUPPORTED')
  }
  if (file.size > SPARSE_MAP_IMPORT_LIMITS.maximumBytes) {
    throw sparseDocumentError('SPARSE_MAP_FILE_TOO_LARGE')
  }
  options.signal?.throwIfAborted()
  let text: string
  try {
    text = await file.text()
  } catch (error) {
    options.signal?.throwIfAborted()
    throw sparseDocumentError('SPARSE_MAP_FILE_READ_FAILED', {
      reason: error instanceof Error ? error.message : '未知读取错误',
    })
  }
  options.signal?.throwIfAborted()
  const document = parseSparseGridJson(text)
  const world = sparseGridDocumentToWorld(document)
  const metrics = getSparseGridWorldMetrics(world)
  return {
    document,
    world,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      obstacleCount: document.obstacles.length,
      terrainCount: document.terrain.length,
      chunkCount: metrics.chunkCount,
      contentBounds: metrics.contentBounds,
    },
  }
}
