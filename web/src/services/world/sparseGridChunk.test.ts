import { describe, expect, it } from 'vitest'
import { WORLD_CHUNK_BITSET_WORD_COUNT } from '@/config/worldGrid'
import {
  createEmptySparseGridChunk,
  getChunkLocalIndex,
  getChunkTerrainCost,
  isChunkCellBlocked,
  isSparseGridChunkEmpty,
  setChunkCellBlocked,
  setChunkTerrainCost,
} from './sparseGridChunk'

const localAt = (index: number) => ({ localX: index % 32, localY: Math.floor(index / 32) })

describe('sparse grid chunk', () => {
  it('creates an empty 1024-bit chunk', () => {
    const chunk = createEmptySparseGridChunk({ chunkX: -1, chunkY: 2 })
    expect(chunk.blockedWords).toHaveLength(WORLD_CHUNK_BITSET_WORD_COUNT)
    expect(chunk.blockedCount).toBe(0)
    expect(chunk.terrain.size).toBe(0)
    expect(isSparseGridChunkEmpty(chunk)).toBe(true)
  })

  it.each([0, 31, 32, 63, 1023])('sets and clears bit %i immutably', (index) => {
    const original = createEmptySparseGridChunk({ chunkX: 0, chunkY: 0 })
    const blocked = setChunkCellBlocked(original, localAt(index), true)
    expect(getChunkLocalIndex(localAt(index))).toBe(index)
    expect(isChunkCellBlocked(blocked, localAt(index))).toBe(true)
    expect(blocked.blockedCount).toBe(1)
    expect(original.blockedCount).toBe(0)
    expect(blocked.blockedWords).not.toBe(original.blockedWords)
    const cleared = setChunkCellBlocked(blocked, localAt(index), false)
    expect(cleared.blockedCount).toBe(0)
    expect(isSparseGridChunkEmpty(cleared)).toBe(true)
  })

  it('returns the original chunk for obstacle no-ops', () => {
    const chunk = createEmptySparseGridChunk({ chunkX: 0, chunkY: 0 })
    expect(setChunkCellBlocked(chunk, localAt(4), false)).toBe(chunk)
  })

  it('sets, replaces, and deletes terrain without storing cost 1', () => {
    const chunk = createEmptySparseGridChunk({ chunkX: 0, chunkY: 0 })
    const terrain = setChunkTerrainCost(chunk, localAt(7), 4)
    expect(getChunkTerrainCost(terrain, localAt(7))).toBe(4)
    expect(terrain.terrain).not.toBe(chunk.terrain)
    expect(setChunkTerrainCost(terrain, localAt(7), 4)).toBe(terrain)
    const cleared = setChunkTerrainCost(terrain, localAt(7), 1)
    expect(getChunkTerrainCost(cleared, localAt(7))).toBe(1)
    expect(cleared.terrain.size).toBe(0)
    expect(isSparseGridChunkEmpty(cleared)).toBe(true)
  })
})
