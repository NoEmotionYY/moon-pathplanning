import type {
  SparseGridDocument,
  SparseGridPlanningHint,
} from '@/types/sparseGridDocument'
import type { WorldBounds, WorldPointTuple } from '@/types/worldGrid'
import { validateSparseGridDocument } from '@/services/import/validateSparseGridDocument'
import { SparseGridWorld } from './SparseGridWorld'

const byYThenX = (
  left: readonly [number, number],
  right: readonly [number, number],
): number => left[1] - right[1] || left[0] - right[0]

export const sparseGridDocumentToWorld = (document: SparseGridDocument): SparseGridWorld => {
  const valid = validateSparseGridDocument(document)
  return SparseGridWorld.createFromPatch(
    {
      start: { x: valid.start[0], y: valid.start[1] },
      goal: { x: valid.goal[0], y: valid.goal[1] },
      movement: valid.movement,
      worldVersion: 0,
    },
    {
      obstacleUpdates: valid.obstacles.map(([x, y]) => ({
        point: { x, y },
        blocked: true,
      })),
      terrainUpdates: valid.terrain.map(({ point: [x, y], cost }) => ({
        point: { x, y },
        cost,
      })),
    },
  )
}

export const sparseGridWorldToDocument = (
  world: SparseGridWorld,
  options: {
    viewportHint?: WorldBounds
    planningHint?: SparseGridPlanningHint
  } = {},
): SparseGridDocument => {
  const obstacles: WorldPointTuple[] = []
  const terrain: Array<{ point: WorldPointTuple; cost: number }> = []
  const coordinates = [...world.getChunkCoordinates()]
    .sort((left, right) => left.chunkY - right.chunkY || left.chunkX - right.chunkX)
  for (const coordinate of coordinates) {
    const chunk = world.getChunkSnapshot(coordinate)!
    for (let wordIndex = 0; wordIndex < chunk.blockedWords.length; wordIndex += 1) {
      let word = chunk.blockedWords[wordIndex] ?? 0
      while (word !== 0) {
        const bitIndex = 31 - Math.clz32(word & -word)
        const point = SparseGridWorld.worldPointFromChunkIndex(
          coordinate,
          wordIndex * 32 + bitIndex,
        )
        obstacles.push([point.x, point.y])
        word = (word & (word - 1)) >>> 0
      }
    }
    for (const [index, cost] of chunk.terrain) {
      const point = SparseGridWorld.worldPointFromChunkIndex(coordinate, index)
      terrain.push({ point: [point.x, point.y], cost })
    }
  }
  obstacles.sort(byYThenX)
  terrain.sort((left, right) => byYThenX(left.point, right.point))
  return validateSparseGridDocument({
    format: 'moon-pathplanning.sparse-grid.v1',
    start: [world.start.x, world.start.y],
    goal: [world.goal.x, world.goal.y],
    movement: world.movement,
    defaultTerrainCost: 1,
    obstacles,
    terrain,
    ...(options.viewportHint === undefined ? {} : { viewportHint: options.viewportHint }),
    ...(options.planningHint === undefined ? {} : { planningHint: options.planningHint }),
  })
}
