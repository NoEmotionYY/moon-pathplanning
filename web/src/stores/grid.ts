import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { clampPoint, keyToPoint, pointKey, samePoint, toTuple, tupleKey } from '@/utils/coordinates'
import type {
  GridMapDocument,
  GridTool,
  MovementMode,
  Point,
  TerrainCost,
} from '@/types/grid'

export const useGridStore = defineStore('grid', () => {
  const width = ref(20)
  const height = ref(20)
  const start = ref<Point>({ x: 1, y: 1 })
  const goal = ref<Point>({ x: 18, y: 18 })
  const movement = ref<MovementMode>('four_way')
  const obstacles = ref<string[]>([])
  const terrain = ref<Record<string, number>>({})
  const activeTool = ref<GridTool>('obstacle')
  const terrainCost = ref<TerrainCost>(2)
  const hoveredCell = ref<Point | null>(null)
  const dirty = ref(false)
  const version = ref(0)

  const obstacleSet = computed(() => new Set(obstacles.value))

  function markChanged(): void {
    dirty.value = true
    version.value += 1
  }

  function isInBounds(point: Point): boolean {
    return point.x >= 0 && point.y >= 0 && point.x < width.value && point.y < height.value
  }

  function setObstacle(point: Point, enabled = true): boolean {
    if (!isInBounds(point) || samePoint(point, start.value) || samePoint(point, goal.value)) {
      return false
    }
    const key = pointKey(point)
    const exists = obstacleSet.value.has(key)
    if (exists === enabled) return false
    obstacles.value = enabled
      ? [...obstacles.value, key]
      : obstacles.value.filter((item) => item !== key)
    if (enabled && key in terrain.value) {
      const nextTerrain = { ...terrain.value }
      delete nextTerrain[key]
      terrain.value = nextTerrain
    }
    markChanged()
    return true
  }

  function erasePoint(point: Point): boolean {
    if (!isInBounds(point)) return false
    const key = pointKey(point)
    const hadObstacle = obstacleSet.value.has(key)
    const hadTerrain = key in terrain.value
    if (!hadObstacle && !hadTerrain) return false
    if (hadObstacle) obstacles.value = obstacles.value.filter((item) => item !== key)
    if (hadTerrain) {
      const nextTerrain = { ...terrain.value }
      delete nextTerrain[key]
      terrain.value = nextTerrain
    }
    markChanged()
    return true
  }

  function setTerrain(point: Point, cost = terrainCost.value): boolean {
    const key = pointKey(point)
    if (
      !isInBounds(point) ||
      samePoint(point, start.value) ||
      samePoint(point, goal.value) ||
      obstacleSet.value.has(key) ||
      terrain.value[key] === cost
    ) {
      return false
    }
    terrain.value = { ...terrain.value, [key]: cost }
    markChanged()
    return true
  }

  function setStart(point: Point): boolean {
    const key = pointKey(point)
    if (!isInBounds(point) || obstacleSet.value.has(key) || samePoint(point, start.value)) return false
    start.value = { ...point }
    markChanged()
    return true
  }

  function setGoal(point: Point): boolean {
    const key = pointKey(point)
    if (!isInBounds(point) || obstacleSet.value.has(key) || samePoint(point, goal.value)) return false
    goal.value = { ...point }
    markChanged()
    return true
  }

  function applyTool(point: Point): boolean {
    if (activeTool.value === 'obstacle') return setObstacle(point, true)
    if (activeTool.value === 'erase') return erasePoint(point)
    if (activeTool.value === 'start') return setStart(point)
    if (activeTool.value === 'goal') return setGoal(point)
    return setTerrain(point)
  }

  function resize(nextWidth: number, nextHeight: number): void {
    width.value = nextWidth
    height.value = nextHeight
    start.value = clampPoint(start.value, nextWidth, nextHeight)
    goal.value = clampPoint(goal.value, nextWidth, nextHeight)
    obstacles.value = obstacles.value.filter((key) => {
      const point = keyToPoint(key)
      return point.x < nextWidth && point.y < nextHeight && !samePoint(point, start.value) && !samePoint(point, goal.value)
    })
    terrain.value = Object.fromEntries(
      Object.entries(terrain.value).filter(([key]) => {
        const point = keyToPoint(key)
        return point.x < nextWidth && point.y < nextHeight
      }),
    )
    markChanged()
  }

  function clearObstacles(): void {
    if (!obstacles.value.length) return
    obstacles.value = []
    markChanged()
  }

  function reset(): void {
    width.value = 20
    height.value = 20
    start.value = { x: 1, y: 1 }
    goal.value = { x: 18, y: 18 }
    movement.value = 'four_way'
    obstacles.value = []
    terrain.value = {}
    activeTool.value = 'obstacle'
    hoveredCell.value = null
    markChanged()
  }

  function loadDocument(document: GridMapDocument): void {
    width.value = document.width
    height.value = document.height
    start.value = { x: document.start[0], y: document.start[1] }
    goal.value = { x: document.goal[0], y: document.goal[1] }
    movement.value = document.movement
    obstacles.value = document.obstacles.map(tupleKey)
    terrain.value = Object.fromEntries(
      document.terrain.map((cell) => [tupleKey(cell.point), cell.cost]),
    )
    dirty.value = false
    version.value += 1
  }

  function toDocument(): GridMapDocument {
    return {
      format: 'moon-pathplanning.grid.v1',
      width: width.value,
      height: height.value,
      start: toTuple(start.value),
      goal: toTuple(goal.value),
      movement: movement.value,
      obstacles: obstacles.value.map((key) => toTuple(keyToPoint(key))),
      terrain: Object.entries(terrain.value).map(([key, cost]) => ({
        point: toTuple(keyToPoint(key)),
        cost,
      })),
    }
  }

  return {
    width,
    height,
    start,
    goal,
    movement,
    obstacles,
    terrain,
    activeTool,
    terrainCost,
    hoveredCell,
    dirty,
    version,
    obstacleSet,
    isInBounds,
    setObstacle,
    erasePoint,
    setTerrain,
    setStart,
    setGoal,
    applyTool,
    resize,
    clearObstacles,
    reset,
    loadDocument,
    toDocument,
  }
})
