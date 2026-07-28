import {
  DEFAULT_WORLD_TERRAIN_COST,
  WORLD_CHUNK_CELL_COUNT,
  WORLD_CHUNK_SIZE,
} from '@/config/worldGrid'
import type { SparseWorldCellSnapshot } from '@/types/sparseGridWorld'
import type { WorldBounds } from '@/types/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { containsWorldPoint, iterateChunkCoordinatesForBounds } from './worldBounds'

export const visitSparseWorldCellsInBounds = (
  world: SparseGridWorld,
  bounds: WorldBounds,
  visitor: (cell: SparseWorldCellSnapshot) => void,
): void => {
  for (const coordinate of iterateChunkCoordinatesForBounds(bounds)) {
    const chunk = world.getChunkSnapshot(coordinate)
    if (!chunk) continue
    for (let localIndex = 0; localIndex < WORLD_CHUNK_CELL_COUNT; localIndex += 1) {
      const point = {
        x: coordinate.chunkX * WORLD_CHUNK_SIZE + localIndex % WORLD_CHUNK_SIZE,
        y: coordinate.chunkY * WORLD_CHUNK_SIZE + Math.floor(localIndex / WORLD_CHUNK_SIZE),
      }
      if (!containsWorldPoint(bounds, point)) continue
      const word = chunk.blockedWords[Math.floor(localIndex / 32)] ?? 0
      const blocked = (word & (1 << (localIndex % 32))) !== 0
      const terrainCost = chunk.terrain.get(localIndex) ?? DEFAULT_WORLD_TERRAIN_COST
      if (blocked || terrainCost !== DEFAULT_WORLD_TERRAIN_COST) {
        visitor({ point, blocked, terrainCost })
      }
    }
  }
}

export const collectSparseWorldCellsInBounds = (
  world: SparseGridWorld,
  bounds: WorldBounds,
): SparseWorldCellSnapshot[] => {
  const cells: SparseWorldCellSnapshot[] = []
  visitSparseWorldCellsInBounds(world, bounds, (cell) => cells.push(cell))
  return cells
}
