import {
  WORLD_BOUNDARY_MAX_EXCLUSIVE,
  WORLD_BOUNDARY_MIN,
} from '@/config/worldGrid'
import type { SparseGridWorldMetrics } from '@/types/sparseGridWorld'
import type { WorldPoint } from '@/types/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { createWorldBounds, worldBoundsFromPoints } from './worldBounds'

export const getSparseGridWorldMetrics = (world: SparseGridWorld): SparseGridWorldMetrics => {
  let blockedCellCount = 0
  let terrainCellCount = 0
  const occupiedPoints: WorldPoint[] = []
  for (const coordinate of world.getChunkCoordinates()) {
    const chunk = world.getChunkSnapshot(coordinate)!
    blockedCellCount += chunk.blockedCount
    terrainCellCount += chunk.terrain.size
    for (let wordIndex = 0; wordIndex < chunk.blockedWords.length; wordIndex += 1) {
      let word = chunk.blockedWords[wordIndex] ?? 0
      while (word !== 0) {
        const bitIndex = 31 - Math.clz32(word & -word)
        occupiedPoints.push(
          SparseGridWorld.worldPointFromChunkIndex(coordinate, wordIndex * 32 + bitIndex),
        )
        word = (word & (word - 1)) >>> 0
      }
    }
    for (const index of chunk.terrain.keys()) {
      occupiedPoints.push(SparseGridWorld.worldPointFromChunkIndex(coordinate, index))
    }
  }
  const occupiedBounds = worldBoundsFromPoints(occupiedPoints)
  const contentPoints = [world.start, world.goal, ...occupiedPoints]
  const contentBounds = worldBoundsFromPoints(contentPoints)
    ?? createWorldBounds(WORLD_BOUNDARY_MIN, WORLD_BOUNDARY_MIN, WORLD_BOUNDARY_MAX_EXCLUSIVE, WORLD_BOUNDARY_MAX_EXCLUSIVE)
  return {
    chunkCount: world.chunkCount,
    blockedCellCount,
    terrainCellCount,
    nonDefaultCellCount: blockedCellCount + terrainCellCount,
    occupiedBounds,
    contentBounds,
  }
}
