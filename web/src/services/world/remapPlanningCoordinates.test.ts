import { describe, expect, it } from 'vitest'
import { WORLD_BOUNDARY_MAX_EXCLUSIVE, WORLD_COORDINATE_MAX } from '@/config/worldGrid'
import { SparseGridWorld } from './SparseGridWorld'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import {
  remapLocalPathToWorld,
  remapLocalPointToWorld,
  remapWorldPointToLocal,
} from './remapPlanningCoordinates'

const materialized = (minX = -10, minY = -20, maxX = 10, maxY = 20) =>
  materializeSparsePlanningWindow(
    SparseGridWorld.create({
      start: { x: minX, y: minY },
      goal: { x: maxX - 1, y: maxY - 1 },
    }),
    { bounds: { minX, minY, maxX, maxY } },
  )

describe('remap planning coordinates', () => {
  it('maps single and multiple local points to negative/cross-zero world coordinates', () => {
    const context = materialized()
    expect(remapLocalPointToWorld(context, [0, 0])).toEqual([-10, -20])
    expect(remapLocalPathToWorld(context, [[0, 0], [10, 20], [19, 39]])).toEqual([
      [-10, -20],
      [0, 0],
      [9, 19],
    ])
    expect(remapLocalPathToWorld(context, [])).toEqual([])
  })

  it('round trips world and local points exactly', () => {
    const context = materialized()
    const world = [-3, 7] as const
    expect(remapLocalPointToWorld(context, remapWorldPointToLocal(context, world))).toEqual(world)
  })

  it('supports WORLD_COORDINATE_MAX', () => {
    const context = materialized(
      WORLD_COORDINATE_MAX - 4,
      WORLD_COORDINATE_MAX - 4,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
      WORLD_BOUNDARY_MAX_EXCLUSIVE,
    )
    expect(remapLocalPointToWorld(context, [4, 4]))
      .toEqual([WORLD_COORDINATE_MAX, WORLD_COORDINATE_MAX])
  })

  it.each([
    { point: [-1, 0] as [number, number] },
    { point: [20, 0] as [number, number] },
    { point: [0, 40] as [number, number] },
    { point: [1.5, 0] as [number, number] },
  ])('rejects local point $point', ({ point }) => {
    expect(() => remapLocalPointToWorld(materialized(), point)).toThrowError(
      expect.objectContaining({ code: 'SPARSE_PLANNING_RESULT_POINT_OUT_OF_BOUNDS' }),
    )
  })

  it('does not modify the input path', () => {
    const path: readonly [number, number][] = Object.freeze([[0, 0], [1, 1]])
    const result = remapLocalPathToWorld(materialized(), path)
    expect(path).toEqual([[0, 0], [1, 1]])
    expect(result).not.toBe(path)
  })
})
