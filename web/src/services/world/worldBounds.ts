import {
  WORLD_BOUNDS_MAX_SPAN,
  WORLD_BOUNDARY_MAX_EXCLUSIVE,
  WORLD_BOUNDARY_MIN,
  WORLD_CHUNK_SIZE,
} from '@/config/worldGrid'
import type { ChunkCoordinate, WorldBounds, WorldPoint } from '@/types/worldGrid'
import { floorDiv } from './worldCoordinates'
import { createWorldGridError } from './worldGridError'

const assertBoundaryCoordinate = (value: number): void => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw createWorldGridError('WORLD_COORDINATE_NOT_INTEGER')
  }
  if (value < WORLD_BOUNDARY_MIN || value > WORLD_BOUNDARY_MAX_EXCLUSIVE) {
    throw createWorldGridError('WORLD_COORDINATE_OUT_OF_RANGE')
  }
}

export const createWorldBounds = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): WorldBounds => {
  for (const value of [minX, minY, maxX, maxY]) assertBoundaryCoordinate(value)
  if (maxX < minX || maxY < minY) throw createWorldGridError('WORLD_BOUNDS_INVALID')
  const width = maxX - minX
  const height = maxY - minY
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width > WORLD_BOUNDS_MAX_SPAN ||
    height > WORLD_BOUNDS_MAX_SPAN
  ) {
    throw createWorldGridError('WORLD_BOUNDS_TOO_LARGE')
  }
  return { minX, minY, maxX, maxY }
}

export const worldBoundsWidth = (bounds: WorldBounds): number =>
  createWorldBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY).maxX - bounds.minX

export const worldBoundsHeight = (bounds: WorldBounds): number =>
  createWorldBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY).maxY - bounds.minY

export const containsWorldPoint = (bounds: WorldBounds, point: WorldPoint): boolean => {
  createWorldBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= bounds.minX &&
    point.x < bounds.maxX &&
    point.y >= bounds.minY &&
    point.y < bounds.maxY
  )
}

export const intersectsWorldBounds = (left: WorldBounds, right: WorldBounds): boolean =>
  intersectWorldBounds(left, right) !== null

export const intersectWorldBounds = (
  left: WorldBounds,
  right: WorldBounds,
): WorldBounds | null => {
  createWorldBounds(left.minX, left.minY, left.maxX, left.maxY)
  createWorldBounds(right.minX, right.minY, right.maxX, right.maxY)
  const minX = Math.max(left.minX, right.minX)
  const minY = Math.max(left.minY, right.minY)
  const maxX = Math.min(left.maxX, right.maxX)
  const maxY = Math.min(left.maxY, right.maxY)
  return maxX <= minX || maxY <= minY ? null : createWorldBounds(minX, minY, maxX, maxY)
}

export const expandWorldBounds = (bounds: WorldBounds, amount: number): WorldBounds => {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw createWorldGridError('WORLD_BOUNDS_INVALID')
  }
  return createWorldBounds(
    bounds.minX - amount,
    bounds.minY - amount,
    bounds.maxX + amount,
    bounds.maxY + amount,
  )
}

export const translateWorldBounds = (
  bounds: WorldBounds,
  deltaX: number,
  deltaY: number,
): WorldBounds =>
  createWorldBounds(
    bounds.minX + deltaX,
    bounds.minY + deltaY,
    bounds.maxX + deltaX,
    bounds.maxY + deltaY,
  )

export const worldBoundsFromPoints = (points: readonly WorldPoint[]): WorldBounds | null => {
  if (points.length === 0) return null
  let minX = points[0]!.x
  let minY = points[0]!.y
  let maxX = minX
  let maxY = minY
  for (const point of points) {
    if (
      point.x < WORLD_BOUNDARY_MIN ||
      point.x >= WORLD_BOUNDARY_MAX_EXCLUSIVE ||
      point.y < WORLD_BOUNDARY_MIN ||
      point.y >= WORLD_BOUNDARY_MAX_EXCLUSIVE ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.y)
    ) {
      throw createWorldGridError(
        Number.isInteger(point.x) && Number.isInteger(point.y)
          ? 'WORLD_COORDINATE_OUT_OF_RANGE'
          : 'WORLD_COORDINATE_NOT_INTEGER',
      )
    }
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return createWorldBounds(minX, minY, maxX + 1, maxY + 1)
}

export function* iterateChunkCoordinatesForBounds(
  bounds: WorldBounds,
): Generator<ChunkCoordinate> {
  const width = worldBoundsWidth(bounds)
  const height = worldBoundsHeight(bounds)
  if (width === 0 || height === 0) return
  const minChunkX = floorDiv(bounds.minX, WORLD_CHUNK_SIZE)
  const maxChunkX = floorDiv(bounds.maxX - 1, WORLD_CHUNK_SIZE)
  const minChunkY = floorDiv(bounds.minY, WORLD_CHUNK_SIZE)
  const maxChunkY = floorDiv(bounds.maxY - 1, WORLD_CHUNK_SIZE)
  for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
      yield { chunkX, chunkY }
    }
  }
}
