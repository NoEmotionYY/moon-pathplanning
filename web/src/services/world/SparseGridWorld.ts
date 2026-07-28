import { DEFAULT_WORLD_TERRAIN_COST, WORLD_CHUNK_SIZE } from '@/config/worldGrid'
import type { MovementMode } from '@/types/grid'
import type {
  SparseGridChunk,
  SparseGridWorldPatch,
  SparseWorldCellSnapshot,
} from '@/types/sparseGridWorld'
import type { ChunkCoordinate, WorldPoint } from '@/types/worldGrid'
import {
  createEmptySparseGridChunk,
  getChunkTerrainCost,
  isChunkCellBlocked,
  isSparseGridChunkEmpty,
  setChunkCellBlocked,
  setChunkTerrainCost,
} from './sparseGridChunk'
import {
  chunkLocalToWorldPoint,
  worldPointKey,
  worldToCellAddress,
} from './worldCoordinates'
import { sparseWorldError } from './sparseGridWorldError'

const chunkKey = ({ chunkX, chunkY }: ChunkCoordinate): string => `${chunkX},${chunkY}`
const samePoint = (left: WorldPoint, right: WorldPoint): boolean =>
  left.x === right.x && left.y === right.y

const assertMovement = (movement: MovementMode): void => {
  if (movement !== 'four_way' && movement !== 'eight_way') {
    throw sparseWorldError('SPARSE_WORLD_PATCH_INVALID')
  }
}

const assertTerrainCost = (cost: number | null): void => {
  if (cost !== null && (!Number.isFinite(cost) || !Number.isInteger(cost) || cost <= 0)) {
    throw sparseWorldError('SPARSE_WORLD_TERRAIN_COST_INVALID')
  }
}

export class SparseGridWorld {
  private constructor(
    private readonly chunks: ReadonlyMap<string, SparseGridChunk>,
    private readonly state: {
      readonly start: WorldPoint
      readonly goal: WorldPoint
      readonly movement: MovementMode
      readonly worldVersion: number
    },
  ) {}

  static create(options: {
    start: WorldPoint
    goal: WorldPoint
    movement?: MovementMode
    worldVersion?: number
  }): SparseGridWorld {
    worldToCellAddress(options.start)
    worldToCellAddress(options.goal)
    if (samePoint(options.start, options.goal)) {
      throw sparseWorldError('SPARSE_WORLD_ENDPOINT_CONFLICT')
    }
    const movement = options.movement ?? 'four_way'
    assertMovement(movement)
    const worldVersion = options.worldVersion ?? 0
    if (!Number.isSafeInteger(worldVersion) || worldVersion < 0) {
      throw sparseWorldError('SPARSE_WORLD_PATCH_INVALID')
    }
    return new SparseGridWorld(new Map(), {
      start: { ...options.start },
      goal: { ...options.goal },
      movement,
      worldVersion,
    })
  }

  static createFromPatch(
    options: {
      start: WorldPoint
      goal: WorldPoint
      movement?: MovementMode
      worldVersion?: number
    },
    patch: SparseGridWorldPatch,
  ): SparseGridWorld {
    const empty = SparseGridWorld.create(options)
    const populated = empty.applyPatch(patch)
    if (populated === empty) return empty
    return new SparseGridWorld(populated.chunks, {
      ...populated.state,
      worldVersion: options.worldVersion ?? 0,
    })
  }

  get start(): WorldPoint { return { ...this.state.start } }
  get goal(): WorldPoint { return { ...this.state.goal } }
  get movement(): MovementMode { return this.state.movement }
  get worldVersion(): number { return this.state.worldVersion }
  get chunkCount(): number { return this.chunks.size }

  isBlocked(point: WorldPoint): boolean {
    const address = worldToCellAddress(point)
    const chunk = this.chunks.get(chunkKey(address.chunk))
    return chunk ? isChunkCellBlocked(chunk, address.local) : false
  }

  terrainCost(point: WorldPoint): number {
    const address = worldToCellAddress(point)
    const chunk = this.chunks.get(chunkKey(address.chunk))
    return chunk ? getChunkTerrainCost(chunk, address.local) : DEFAULT_WORLD_TERRAIN_COST
  }

  getCell(point: WorldPoint): SparseWorldCellSnapshot {
    return {
      point: { ...point },
      blocked: this.isBlocked(point),
      terrainCost: this.terrainCost(point),
    }
  }

  getChunkSnapshot(coordinate: ChunkCoordinate): SparseGridChunk | null {
    const chunk = this.chunks.get(chunkKey(coordinate))
    return chunk ? {
      coordinate: { ...chunk.coordinate },
      blockedWords: new Uint32Array(chunk.blockedWords),
      blockedCount: chunk.blockedCount,
      terrain: new Map(chunk.terrain),
    } : null
  }

  getChunkCoordinates(): readonly ChunkCoordinate[] {
    return [...this.chunks.values()].map((chunk) => ({ ...chunk.coordinate }))
  }

  withObstacle(point: WorldPoint, blocked = true): SparseGridWorld {
    if (blocked && (samePoint(point, this.state.start) || samePoint(point, this.state.goal))) {
      throw sparseWorldError('SPARSE_WORLD_OBSTACLE_ON_ENDPOINT')
    }
    return this.applyPatch({ obstacleUpdates: [{ point, blocked }] })
  }

  withTerrain(point: WorldPoint, cost: number | null): SparseGridWorld {
    assertTerrainCost(cost)
    const clearing = cost === null || cost === DEFAULT_WORLD_TERRAIN_COST
    if (!clearing && this.isBlocked(point)) {
      throw sparseWorldError('SPARSE_WORLD_TERRAIN_ON_BLOCKED')
    }
    if (!clearing && (samePoint(point, this.state.start) || samePoint(point, this.state.goal))) {
      throw sparseWorldError('SPARSE_WORLD_TERRAIN_ON_ENDPOINT')
    }
    return this.applyPatch({ terrainUpdates: [{ point, cost }] })
  }

  withStart(point: WorldPoint): SparseGridWorld {
    if (samePoint(point, this.state.goal)) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_CONFLICT')
    if (this.isBlocked(point)) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_BLOCKED')
    return this.applyPatch({ start: point })
  }

  withGoal(point: WorldPoint): SparseGridWorld {
    if (samePoint(point, this.state.start)) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_CONFLICT')
    if (this.isBlocked(point)) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_BLOCKED')
    return this.applyPatch({ goal: point })
  }

  withMovement(movement: MovementMode): SparseGridWorld {
    assertMovement(movement)
    return this.applyPatch({ movement })
  }

  applyPatch(patch: SparseGridWorldPatch): SparseGridWorld {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw sparseWorldError('SPARSE_WORLD_PATCH_INVALID')
    }
    if (
      (patch.obstacleUpdates !== undefined && !Array.isArray(patch.obstacleUpdates)) ||
      (patch.terrainUpdates !== undefined && !Array.isArray(patch.terrainUpdates))
    ) throw sparseWorldError('SPARSE_WORLD_PATCH_INVALID')
    const start = patch.start ? { ...patch.start } : this.state.start
    const goal = patch.goal ? { ...patch.goal } : this.state.goal
    worldToCellAddress(start)
    worldToCellAddress(goal)
    if (samePoint(start, goal)) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_CONFLICT')
    const movement = patch.movement ?? this.state.movement
    assertMovement(movement)

    const obstacleUpdates = new Map<string, { point: WorldPoint; blocked: boolean }>()
    for (const update of patch.obstacleUpdates ?? []) {
      worldToCellAddress(update.point)
      if (typeof update.blocked !== 'boolean') throw sparseWorldError('SPARSE_WORLD_PATCH_INVALID')
      obstacleUpdates.set(worldPointKey(update.point), {
        point: { ...update.point },
        blocked: update.blocked,
      })
    }
    const terrainUpdates = new Map<string, { point: WorldPoint; cost: number | null }>()
    for (const update of patch.terrainUpdates ?? []) {
      worldToCellAddress(update.point)
      assertTerrainCost(update.cost)
      terrainUpdates.set(worldPointKey(update.point), {
        point: { ...update.point },
        cost: update.cost,
      })
    }

    let nextChunks: Map<string, SparseGridChunk> | null = null
    const updateChunk = (
      point: WorldPoint,
      updater: (chunk: SparseGridChunk, local: ReturnType<typeof worldToCellAddress>['local']) => SparseGridChunk,
    ): void => {
      const address = worldToCellAddress(point)
      const key = chunkKey(address.chunk)
      const current = (nextChunks ?? this.chunks).get(key) ?? createEmptySparseGridChunk(address.chunk)
      const next = updater(current, address.local)
      if (next === current) return
      nextChunks ??= new Map(this.chunks)
      if (isSparseGridChunkEmpty(next)) nextChunks.delete(key)
      else nextChunks.set(key, next)
    }

    for (const update of obstacleUpdates.values()) {
      updateChunk(update.point, (chunk, local) => {
        let next = setChunkCellBlocked(chunk, local, update.blocked)
        if (update.blocked) next = setChunkTerrainCost(next, local, null)
        return next
      })
    }
    for (const update of terrainUpdates.values()) {
      const finalObstacle = obstacleUpdates.get(worldPointKey(update.point))?.blocked
        ?? this.isBlocked(update.point)
      if (finalObstacle) continue
      updateChunk(update.point, (chunk, local) => setChunkTerrainCost(chunk, local, update.cost))
    }

    const endpointKeys = [worldPointKey(start), worldPointKey(goal)]
    for (const [index, endpoint] of [start, goal].entries()) {
      const endpointTerrain = terrainUpdates.get(endpointKeys[index]!)
      if (
        endpointTerrain &&
        endpointTerrain.cost !== null &&
        endpointTerrain.cost !== DEFAULT_WORLD_TERRAIN_COST
      ) throw sparseWorldError('SPARSE_WORLD_TERRAIN_ON_ENDPOINT')
      const finalBlocked = obstacleUpdates.get(endpointKeys[index]!)?.blocked
        ?? this.isBlocked(endpoint)
      if (finalBlocked) throw sparseWorldError('SPARSE_WORLD_ENDPOINT_BLOCKED')
      updateChunk(endpoint, (chunk, local) => setChunkTerrainCost(chunk, local, null))
    }

    const changedState =
      !samePoint(start, this.state.start) ||
      !samePoint(goal, this.state.goal) ||
      movement !== this.state.movement
    if (!nextChunks && !changedState) return this
    return new SparseGridWorld(nextChunks ?? this.chunks, {
      start,
      goal,
      movement,
      worldVersion: this.state.worldVersion + 1,
    })
  }

  static worldPointFromChunkIndex(
    chunk: ChunkCoordinate,
    localIndex: number,
  ): WorldPoint {
    return chunkLocalToWorldPoint(chunk, {
      localX: localIndex % WORLD_CHUNK_SIZE,
      localY: Math.floor(localIndex / WORLD_CHUNK_SIZE),
    })
  }
}
