import {
  DEFAULT_WORLD_TERRAIN_COST,
  WORLD_CHUNK_BITSET_WORD_COUNT,
  WORLD_CHUNK_SIZE,
} from '@/config/worldGrid'
import type { SparseGridChunk } from '@/types/sparseGridWorld'
import type { ChunkCoordinate, ChunkLocalCoordinate } from '@/types/worldGrid'
import { createWorldGridError } from './worldGridError'

const assertLocal = (local: ChunkLocalCoordinate): void => {
  if (
    !Number.isInteger(local.localX) ||
    !Number.isInteger(local.localY) ||
    local.localX < 0 ||
    local.localY < 0 ||
    local.localX >= WORLD_CHUNK_SIZE ||
    local.localY >= WORLD_CHUNK_SIZE
  ) throw createWorldGridError('CHUNK_LOCAL_COORDINATE_INVALID')
}

const assertChunk = (chunk: SparseGridChunk): void => {
  if (chunk.blockedWords.length !== WORLD_CHUNK_BITSET_WORD_COUNT) {
    throw createWorldGridError('CHUNK_COORDINATE_INVALID')
  }
}

export const createEmptySparseGridChunk = (coordinate: ChunkCoordinate): SparseGridChunk => {
  if (!Number.isSafeInteger(coordinate.chunkX) || !Number.isSafeInteger(coordinate.chunkY)) {
    throw createWorldGridError('CHUNK_COORDINATE_INVALID')
  }
  return {
    coordinate: { ...coordinate },
    blockedWords: new Uint32Array(WORLD_CHUNK_BITSET_WORD_COUNT),
    blockedCount: 0,
    terrain: new Map(),
  }
}

export const getChunkLocalIndex = (local: ChunkLocalCoordinate): number => {
  assertLocal(local)
  return local.localY * WORLD_CHUNK_SIZE + local.localX
}

export const isChunkCellBlocked = (
  chunk: SparseGridChunk,
  local: ChunkLocalCoordinate,
): boolean => {
  assertChunk(chunk)
  const index = getChunkLocalIndex(local)
  const word = chunk.blockedWords[Math.floor(index / 32)] ?? 0
  return (word & (1 << (index % 32))) !== 0
}

export const setChunkCellBlocked = (
  chunk: SparseGridChunk,
  local: ChunkLocalCoordinate,
  blocked: boolean,
): SparseGridChunk => {
  const current = isChunkCellBlocked(chunk, local)
  if (current === blocked) return chunk
  const index = getChunkLocalIndex(local)
  const wordIndex = Math.floor(index / 32)
  const mask = 1 << (index % 32)
  const blockedWords = new Uint32Array(chunk.blockedWords)
  blockedWords[wordIndex] = blocked
    ? ((blockedWords[wordIndex]! | mask) >>> 0)
    : ((blockedWords[wordIndex]! & ~mask) >>> 0)
  return {
    ...chunk,
    blockedWords,
    blockedCount: chunk.blockedCount + (blocked ? 1 : -1),
  }
}

export const getChunkTerrainCost = (
  chunk: SparseGridChunk,
  local: ChunkLocalCoordinate,
): number => chunk.terrain.get(getChunkLocalIndex(local)) ?? DEFAULT_WORLD_TERRAIN_COST

export const setChunkTerrainCost = (
  chunk: SparseGridChunk,
  local: ChunkLocalCoordinate,
  cost: number | null,
): SparseGridChunk => {
  if (cost !== null && (!Number.isFinite(cost) || !Number.isInteger(cost) || cost <= 0)) {
    throw createWorldGridError('CHUNK_LOCAL_COORDINATE_INVALID')
  }
  const index = getChunkLocalIndex(local)
  const normalized = cost === DEFAULT_WORLD_TERRAIN_COST ? null : cost
  const current = chunk.terrain.get(index) ?? null
  if (current === normalized) return chunk
  const terrain = new Map(chunk.terrain)
  if (normalized === null) terrain.delete(index)
  else terrain.set(index, normalized)
  return { ...chunk, terrain }
}

export const isSparseGridChunkEmpty = (chunk: SparseGridChunk): boolean =>
  chunk.blockedCount === 0 && chunk.terrain.size === 0
