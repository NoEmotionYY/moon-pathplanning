import type { MovementMode } from './grid'
import type {
  ChunkCoordinate,
  WorldBounds,
  WorldPoint,
} from './worldGrid'

export interface SparseGridChunk {
  readonly coordinate: ChunkCoordinate
  readonly blockedWords: Uint32Array
  readonly blockedCount: number
  readonly terrain: ReadonlyMap<number, number>
}

export interface SparseGridWorldState {
  readonly start: WorldPoint
  readonly goal: WorldPoint
  readonly movement: MovementMode
  readonly worldVersion: number
}

export interface SparseWorldCellSnapshot {
  readonly point: WorldPoint
  readonly blocked: boolean
  readonly terrainCost: number
}

export interface SparseWorldObstacleUpdate {
  readonly point: WorldPoint
  readonly blocked: boolean
}

export interface SparseWorldTerrainUpdate {
  readonly point: WorldPoint
  readonly cost: number | null
}

export interface SparseGridWorldPatch {
  readonly obstacleUpdates?: readonly SparseWorldObstacleUpdate[]
  readonly terrainUpdates?: readonly SparseWorldTerrainUpdate[]
  readonly start?: WorldPoint
  readonly goal?: WorldPoint
  readonly movement?: MovementMode
}

export interface SparseGridWorldMetrics {
  readonly chunkCount: number
  readonly blockedCellCount: number
  readonly terrainCellCount: number
  readonly nonDefaultCellCount: number
  readonly occupiedBounds: WorldBounds | null
  readonly contentBounds: WorldBounds
}
