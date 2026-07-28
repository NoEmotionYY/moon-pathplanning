import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { clampPoint, keyToPoint, pointKey, samePoint, toTuple, tupleKey } from '@/utils/coordinates'
import type { GridMapImportState } from '@/types/mapImportTransaction'
import type {
  GridMapDocument,
  GridTool,
  MovementMode,
  Point,
  TerrainCost,
} from '@/types/grid'

interface GridState {
  width: number
  height: number
  start: Point
  goal: Point
  movement: MovementMode
  obstacles: string[]
  terrain: Record<string, number>
  dirty: boolean
  version: number
}

function createInitialState(version = 0): GridState {
  return {
    width: 20,
    height: 20,
    start: { x: 1, y: 1 },
    goal: { x: 18, y: 18 },
    movement: 'four_way',
    obstacles: [],
    terrain: {},
    dirty: false,
    version,
  }
}

export const useGridStore = defineStore('grid', () => {
  const state = shallowRef<GridState>(createInitialState())
  const width = computed(() => state.value.width)
  const height = computed(() => state.value.height)
  const start = computed(() => state.value.start)
  const goal = computed(() => state.value.goal)
  const movement = computed({
    get: () => state.value.movement,
    set: (value: MovementMode) => {
      state.value = { ...state.value, movement: value }
    },
  })
  const obstacles = computed(() => state.value.obstacles)
  const terrain = computed(() => state.value.terrain)
  const dirty = computed(() => state.value.dirty)
  const version = computed(() => state.value.version)
  const activeTool = ref<GridTool>('obstacle')
  const terrainCost = ref<TerrainCost>(2)
  const hoveredCell = ref<Point | null>(null)

  const obstacleSet = computed(() => new Set(state.value.obstacles))

  function replaceChangedState(next: Omit<GridState, 'dirty' | 'version'>): void {
    state.value = {
      ...next,
      dirty: true,
      version: state.value.version + 1,
    }
  }

  function isInBounds(point: Point): boolean {
    return point.x >= 0 && point.y >= 0 && point.x < state.value.width && point.y < state.value.height
  }

  function setObstacle(point: Point, enabled = true): boolean {
    const current = state.value
    if (!isInBounds(point) || samePoint(point, current.start) || samePoint(point, current.goal)) {
      return false
    }
    const key = pointKey(point)
    const exists = obstacleSet.value.has(key)
    if (exists === enabled) return false
    const nextObstacles = enabled
      ? [...current.obstacles, key]
      : current.obstacles.filter((item) => item !== key)
    let nextTerrain = current.terrain
    if (enabled && key in current.terrain) {
      nextTerrain = { ...current.terrain }
      delete nextTerrain[key]
    }
    replaceChangedState({ ...current, obstacles: nextObstacles, terrain: nextTerrain })
    return true
  }

  function erasePoint(point: Point): boolean {
    if (!isInBounds(point)) return false
    const current = state.value
    const key = pointKey(point)
    const hadObstacle = obstacleSet.value.has(key)
    const hadTerrain = key in current.terrain
    if (!hadObstacle && !hadTerrain) return false
    const nextObstacles = hadObstacle
      ? current.obstacles.filter((item) => item !== key)
      : current.obstacles
    let nextTerrain = current.terrain
    if (hadTerrain) {
      nextTerrain = { ...current.terrain }
      delete nextTerrain[key]
    }
    replaceChangedState({ ...current, obstacles: nextObstacles, terrain: nextTerrain })
    return true
  }

  function setTerrain(point: Point, cost = terrainCost.value): boolean {
    const current = state.value
    const key = pointKey(point)
    if (
      !isInBounds(point) ||
      samePoint(point, current.start) ||
      samePoint(point, current.goal) ||
      obstacleSet.value.has(key) ||
      current.terrain[key] === cost
    ) {
      return false
    }
    replaceChangedState({ ...current, terrain: { ...current.terrain, [key]: cost } })
    return true
  }

  function setStart(point: Point): boolean {
    const current = state.value
    const key = pointKey(point)
    if (!isInBounds(point) || obstacleSet.value.has(key) || samePoint(point, current.start)) return false
    replaceChangedState({ ...current, start: { ...point } })
    return true
  }

  function setGoal(point: Point): boolean {
    const current = state.value
    const key = pointKey(point)
    if (!isInBounds(point) || obstacleSet.value.has(key) || samePoint(point, current.goal)) return false
    replaceChangedState({ ...current, goal: { ...point } })
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
    const current = state.value
    const nextStart = clampPoint(current.start, nextWidth, nextHeight)
    const nextGoal = clampPoint(current.goal, nextWidth, nextHeight)
    const nextObstacles = current.obstacles.filter((key) => {
      const point = keyToPoint(key)
      return point.x < nextWidth && point.y < nextHeight && !samePoint(point, nextStart) && !samePoint(point, nextGoal)
    })
    const nextTerrain = Object.fromEntries(
      Object.entries(current.terrain).filter(([key]) => {
        const point = keyToPoint(key)
        return point.x < nextWidth && point.y < nextHeight
      }),
    )
    replaceChangedState({
      ...current,
      width: nextWidth,
      height: nextHeight,
      start: nextStart,
      goal: nextGoal,
      obstacles: nextObstacles,
      terrain: nextTerrain,
    })
  }

  function clearObstacles(): void {
    const current = state.value
    if (!current.obstacles.length) return
    replaceChangedState({ ...current, obstacles: [] })
  }

  function reset(): void {
    state.value = {
      ...createInitialState(state.value.version + 1),
      dirty: true,
    }
    activeTool.value = 'obstacle'
    hoveredCell.value = null
  }

  function applyGridMapDocument(
    document: GridMapDocument,
    options: { incrementVersion?: boolean; dirty?: boolean } = {},
  ): void {
    state.value = {
      width: document.width,
      height: document.height,
      start: { x: document.start[0], y: document.start[1] },
      goal: { x: document.goal[0], y: document.goal[1] },
      movement: document.movement,
      obstacles: document.obstacles.map(tupleKey),
      terrain: Object.fromEntries(
        document.terrain.map((cell) => [tupleKey(cell.point), cell.cost]),
      ),
      dirty: options.dirty ?? false,
      version: state.value.version + (options.incrementVersion ?? true ? 1 : 0),
    }
  }

  function restoreGridMapSnapshot(snapshot: GridMapImportState): void {
    const document = snapshot.document
    state.value = {
      width: document.width,
      height: document.height,
      start: { x: document.start[0], y: document.start[1] },
      goal: { x: document.goal[0], y: document.goal[1] },
      movement: document.movement,
      obstacles: document.obstacles.map(tupleKey),
      terrain: Object.fromEntries(
        document.terrain.map((cell) => [tupleKey(cell.point), cell.cost]),
      ),
      dirty: snapshot.dirty,
      version: snapshot.mapVersion,
    }
  }

  function loadDocument(document: GridMapDocument): void {
    applyGridMapDocument(document)
  }

  function toDocument(): GridMapDocument {
    const current = state.value
    return {
      format: 'moon-pathplanning.grid.v1',
      width: current.width,
      height: current.height,
      start: toTuple(current.start),
      goal: toTuple(current.goal),
      movement: current.movement,
      obstacles: current.obstacles.map((key) => toTuple(keyToPoint(key))),
      terrain: Object.entries(current.terrain).map(([key, cost]) => ({
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
    applyGridMapDocument,
    restoreGridMapSnapshot,
    loadDocument,
    toDocument,
  }
})
