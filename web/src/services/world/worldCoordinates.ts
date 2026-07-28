import {
  WORLD_CHUNK_SIZE,
  WORLD_COORDINATE_MAX,
  WORLD_COORDINATE_MIN,
} from '@/config/worldGrid'
import type {
  ChunkCoordinate,
  ChunkLocalCoordinate,
  WorldCellAddress,
  WorldPoint,
} from '@/types/worldGrid'
import { createWorldGridError } from './worldGridError'

const assertWorldCoordinate = (value: number): void => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw createWorldGridError('WORLD_COORDINATE_NOT_INTEGER')
  }
  if (value < WORLD_COORDINATE_MIN || value > WORLD_COORDINATE_MAX) {
    throw createWorldGridError('WORLD_COORDINATE_OUT_OF_RANGE')
  }
}

const assertWorldPoint = (point: WorldPoint): void => {
  assertWorldCoordinate(point.x)
  assertWorldCoordinate(point.y)
}

const assertChunkCoordinate = ({ chunkX, chunkY }: ChunkCoordinate): void => {
  if (
    !Number.isSafeInteger(chunkX) ||
    !Number.isSafeInteger(chunkY)
  ) {
    throw createWorldGridError('CHUNK_COORDINATE_INVALID')
  }
}

const assertChunkLocalCoordinate = ({ localX, localY }: ChunkLocalCoordinate): void => {
  if (
    !Number.isInteger(localX) ||
    !Number.isInteger(localY) ||
    localX < 0 ||
    localY < 0 ||
    localX >= WORLD_CHUNK_SIZE ||
    localY >= WORLD_CHUNK_SIZE
  ) {
    throw createWorldGridError('CHUNK_LOCAL_COORDINATE_INVALID')
  }
}

export const floorDiv = (value: number, divisor: number): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw createWorldGridError('WORLD_COORDINATE_NOT_INTEGER')
  }
  if (!Number.isFinite(divisor) || !Number.isInteger(divisor) || divisor <= 0) {
    throw createWorldGridError('CHUNK_COORDINATE_INVALID')
  }
  return Math.floor(value / divisor)
}

export const positiveModulo = (value: number, divisor: number): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw createWorldGridError('WORLD_COORDINATE_NOT_INTEGER')
  }
  if (!Number.isFinite(divisor) || !Number.isInteger(divisor) || divisor <= 0) {
    throw createWorldGridError('CHUNK_COORDINATE_INVALID')
  }
  return ((value % divisor) + divisor) % divisor
}

export const worldToChunkCoordinate = (point: WorldPoint): ChunkCoordinate => {
  assertWorldPoint(point)
  return {
    chunkX: floorDiv(point.x, WORLD_CHUNK_SIZE),
    chunkY: floorDiv(point.y, WORLD_CHUNK_SIZE),
  }
}

export const worldToChunkLocalCoordinate = (point: WorldPoint): ChunkLocalCoordinate => {
  assertWorldPoint(point)
  return {
    localX: positiveModulo(point.x, WORLD_CHUNK_SIZE),
    localY: positiveModulo(point.y, WORLD_CHUNK_SIZE),
  }
}

export const worldToCellAddress = (point: WorldPoint): WorldCellAddress => ({
  chunk: worldToChunkCoordinate(point),
  local: worldToChunkLocalCoordinate(point),
})

export const chunkLocalToWorldPoint = (
  chunk: ChunkCoordinate,
  local: ChunkLocalCoordinate,
): WorldPoint => {
  assertChunkCoordinate(chunk)
  assertChunkLocalCoordinate(local)
  const point = {
    x: chunk.chunkX * WORLD_CHUNK_SIZE + local.localX,
    y: chunk.chunkY * WORLD_CHUNK_SIZE + local.localY,
  }
  assertWorldPoint(point)
  return point
}

export const worldPointKey = (point: WorldPoint): string => {
  assertWorldPoint(point)
  return `${point.x},${point.y}`
}

export const parseWorldPointKey = (key: string): WorldPoint => {
  const match = /^(-?\d+),(-?\d+)$/.exec(key)
  if (!match) throw createWorldGridError('WORLD_COORDINATE_NOT_INTEGER')
  const point = { x: Number(match[1]), y: Number(match[2]) }
  assertWorldPoint(point)
  return point
}

