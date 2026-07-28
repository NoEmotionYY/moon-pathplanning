import { describe, expect, it } from 'vitest'
import { WORLD_CHUNK_SIZE, WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import {
  chunkLocalToWorldPoint,
  floorDiv,
  parseWorldPointKey,
  positiveModulo,
  worldPointKey,
  worldToCellAddress,
  worldToChunkCoordinate,
  worldToChunkLocalCoordinate,
} from './worldCoordinates'

describe('world coordinates', () => {
  it.each([
    [{ x: 33, y: 65 }, { chunkX: 1, chunkY: 2 }, { localX: 1, localY: 1 }],
    [{ x: 0, y: 0 }, { chunkX: 0, chunkY: 0 }, { localX: 0, localY: 0 }],
    [{ x: -1, y: -1 }, { chunkX: -1, chunkY: -1 }, { localX: 31, localY: 31 }],
    [{ x: -31, y: -31 }, { chunkX: -1, chunkY: -1 }, { localX: 1, localY: 1 }],
    [{ x: -32, y: -32 }, { chunkX: -1, chunkY: -1 }, { localX: 0, localY: 0 }],
    [{ x: -33, y: -33 }, { chunkX: -2, chunkY: -2 }, { localX: 31, localY: 31 }],
  ])('maps world point %j to chunk and local coordinates', (point, chunk, local) => {
    expect(worldToChunkCoordinate(point)).toEqual(chunk)
    expect(worldToChunkLocalCoordinate(point)).toEqual(local)
    expect(worldToCellAddress(point)).toEqual({ chunk, local })
  })

  it('uses mathematical floor division and positive modulo at chunk boundaries', () => {
    expect(floorDiv(31, WORLD_CHUNK_SIZE)).toBe(0)
    expect(floorDiv(32, WORLD_CHUNK_SIZE)).toBe(1)
    expect(floorDiv(-32, WORLD_CHUNK_SIZE)).toBe(-1)
    expect(positiveModulo(-32, WORLD_CHUNK_SIZE)).toBe(0)
  })

  it('always produces local coordinates in the chunk range', () => {
    for (let value = -100; value <= 100; value += 1) {
      const local = worldToChunkLocalCoordinate({ x: value, y: -value })
      expect(local.localX).toBeGreaterThanOrEqual(0)
      expect(local.localX).toBeLessThan(WORLD_CHUNK_SIZE)
      expect(local.localY).toBeGreaterThanOrEqual(0)
      expect(local.localY).toBeLessThan(WORLD_CHUNK_SIZE)
    }
  })

  it.each([
    { x: -1_000_000_000, y: 1_000_000_000 },
    { x: -65, y: 96 },
    { x: 65, y: -96 },
  ])('round trips %j through its cell address', (point) => {
    const address = worldToCellAddress(point)
    expect(chunkLocalToWorldPoint(address.chunk, address.local)).toEqual(point)
  })

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid coordinate %s', (x) => {
    expect(() => worldToChunkCoordinate({ x, y: 0 })).toThrowError(
      expect.objectContaining({ code: 'WORLD_COORDINATE_NOT_INTEGER' }),
    )
  })

  it('rejects coordinates outside the configured business range', () => {
    expect(() => worldPointKey({ x: 1_000_000_001, y: 0 })).toThrowError(
      expect.objectContaining({ code: 'WORLD_COORDINATE_OUT_OF_RANGE' }),
    )
  })

  it('accepts the maximum configured world point', () => {
    expect(worldToCellAddress({ x: WORLD_COORDINATE_MAX, y: WORLD_COORDINATE_MAX }))
      .toEqual({
        chunk: { chunkX: 31_250_000, chunkY: 31_250_000 },
        local: { localX: 0, localY: 0 },
      })
  })

  it.each([
    { x: 0, y: 0 },
    { x: -33, y: 42 },
    { x: 999_999_999, y: -999_999_999 },
  ])('round trips %j through a width-independent key', (point) => {
    expect(parseWorldPointKey(worldPointKey(point))).toEqual(point)
  })

  it('rejects malformed keys', () => {
    expect(() => parseWorldPointKey('1,2,3')).toThrowError(
      expect.objectContaining({ code: 'WORLD_COORDINATE_NOT_INTEGER' }),
    )
  })

  it('does not modify input points', () => {
    const point = Object.freeze({ x: -33, y: 64 })
    worldToCellAddress(point)
    worldPointKey(point)
    expect(point).toEqual({ x: -33, y: 64 })
  })
})
