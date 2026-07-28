<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { usePreferencesStore } from '@/stores/preferences'
import { buildPolylinePoints, pointKey, samePoint } from '@/utils/coordinates'
import { cancelFromContextMenu, GridStrokeSession } from '@/utils/gridStroke'
import { shouldShowFinalPath } from '@/utils/pathRendering'
import type { Point } from '@/types/grid'

const grid = useGridStore()
const planner = usePlannerStore()
const preferences = usePreferencesStore()
const { width, height, start, goal, terrain, hoveredCell } = storeToRefs(grid)
const canvas = ref<HTMLElement | null>(null)
const stroke = new GridStrokeSession()

const cells = computed(() =>
  Array.from({ length: width.value * height.value }, (_, index) => ({
    x: index % width.value,
    y: Math.floor(index / width.value),
  })),
)
const cellSize = computed(() =>
  Math.max(12, Math.min(34, 680 / Math.max(width.value, height.value))),
)
const pathPoints = computed(() =>
  buildPolylinePoints(planner.result?.path ?? [], cellSize.value),
)
const showFinalPath = computed(() =>
  shouldShowFinalPath({
    hasPath: Boolean(pathPoints.value),
    traceSupported: planner.traceSupported,
    traceTotalSteps: planner.traceTotalSteps,
    playbackStatus: planner.playbackStatus,
    showDuringTrace: preferences.showPathDuringTrace,
  }),
)

const classFor = (point: Point) => {
  const key = pointKey(point)
  return {
    'is-obstacle': grid.obstacleSet.has(key),
    'is-start': samePoint(point, start.value),
    'is-goal': samePoint(point, goal.value),
    'is-terrain-2': terrain.value[key] === 2,
    'is-terrain-4': terrain.value[key] === 4,
    'is-terrain-8': terrain.value[key] === 8,
    'is-hovered': Boolean(hoveredCell.value && samePoint(point, hoveredCell.value)),
    'is-visited': planner.visitedCells.has(key),
    'is-expanded': planner.expandedCells.has(key),
    'is-frontier': planner.frontierCells.has(key),
    'is-current': Boolean(
      planner.currentCell &&
      planner.currentCell[0] === point.x &&
      planner.currentCell[1] === point.y
    ),
  }
}

const pointFromEvent = (event: PointerEvent): Point | null => {
  if (!canvas.value) return null
  const bounds = canvas.value.getBoundingClientRect()
  const point = {
    x: Math.floor((event.clientX - bounds.left) / cellSize.value),
    y: Math.floor((event.clientY - bounds.top) / cellSize.value),
  }
  return grid.isInBounds(point) ? point : null
}

const isStrokeTool = () => ['obstacle', 'erase', 'terrain'].includes(grid.activeTool)

const applyPoints = (points: Point[]) => {
  if (planner.isRunning) return
  for (const point of points) grid.applyTool(point)
}

const cancelStroke = () => {
  const pointerId = stroke.pointerId
  stroke.cancel()
  if (canvas.value && pointerId !== null && canvas.value.hasPointerCapture?.(pointerId)) {
    canvas.value.releasePointerCapture(pointerId)
  }
}

const pointerDown = (event: PointerEvent) => {
  if (event.button !== 0 || planner.isRunning) return
  const point = pointFromEvent(event)
  if (!point) return
  event.preventDefault()

  if (!isStrokeTool()) {
    grid.applyTool(point)
    return
  }

  canvas.value?.setPointerCapture?.(event.pointerId)
  applyPoints(stroke.start(event.pointerId, point))
}

const pointerMove = (event: PointerEvent) => {
  if (stroke.active && (event.buttons & 1) === 0) {
    cancelStroke()
    return
  }
  const point = pointFromEvent(event)
  hoveredCell.value = point
  if (!point || !stroke.active) return
  applyPoints(stroke.move(event.pointerId, point))
}

const pointerEnd = (event: PointerEvent) => {
  if (stroke.pointerId !== event.pointerId) return
  cancelStroke()
}

const contextMenu = (event: MouseEvent) => cancelFromContextMenu(event, cancelStroke)

const handleKeyboard = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
  const shortcuts = ['obstacle', 'erase', 'start', 'goal', 'terrain'] as const
  const index = Number(event.key) - 1
  if (index >= 0 && index < shortcuts.length && shortcuts[index]) {
    grid.activeTool = shortcuts[index]
  }
}

const handleWindowBlur = () => cancelStroke()

watch(
  [() => grid.activeTool, width, height],
  cancelStroke,
  { flush: 'sync' },
)

watch(
  [width, height],
  async () => {
    await nextTick()
    if (!canvas.value?.parentElement) return
    canvas.value.parentElement.scrollLeft = 0
    canvas.value.parentElement.scrollTop = 0
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard)
  window.addEventListener('blur', handleWindowBlur)
  window.addEventListener('pointerup', pointerEnd)
  window.addEventListener('pointercancel', pointerEnd)
})
onBeforeUnmount(() => {
  cancelStroke()
  window.removeEventListener('keydown', handleKeyboard)
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('pointerup', pointerEnd)
  window.removeEventListener('pointercancel', pointerEnd)
})
</script>

<template>
  <div
    class="grid-stage"
    :class="{ 'is-disabled': planner.isRunning, 'has-no-path': planner.status === 'no_path' }"
    @pointerleave="hoveredCell = null"
  >
    <div
      ref="canvas"
      class="grid-canvas"
      role="grid"
      aria-label="可编辑路径规划网格"
      :style="{
        '--cell-size': `${cellSize}px`,
        width: `${width * cellSize}px`,
        height: `${height * cellSize}px`,
        gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
      }"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerEnd"
      @pointercancel="pointerEnd"
      @lostpointercapture="pointerEnd"
      @contextmenu="contextMenu"
    >
      <div
        v-for="point in cells"
        :key="`${point.x},${point.y}`"
        role="gridcell"
        class="grid-cell"
        :class="classFor(point)"
        :aria-label="`坐标 ${point.x}, ${point.y}`"
      >
        <span v-if="samePoint(point, start)" class="endpoint-label">S</span>
        <span v-else-if="samePoint(point, goal)" class="endpoint-label">G</span>
        <span v-else-if="terrain[pointKey(point)]" class="cost-label">
          {{ terrain[pointKey(point)] }}
        </span>
      </div>
      <svg
        v-if="showFinalPath"
        :key="`${planner.resultVersion}-${pathPoints}`"
        class="path-layer"
        :viewBox="`0 0 ${width * cellSize} ${height * cellSize}`"
        preserveAspectRatio="none"
        aria-label="最终规划路径"
      >
        <polyline
          class="path-glow"
          :points="pathPoints"
          pathLength="1"
          vector-effect="non-scaling-stroke"
        />
        <polyline
          class="path-core"
          :points="pathPoints"
          pathLength="1"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>
    <div v-if="planner.isRunning" class="grid-loading">
      <span class="radar-loader" />
      <strong>MoonBit 正在规划</strong>
      <small>算法在独立 Worker 中运行，界面仍可响应</small>
    </div>
    <div v-else-if="planner.status === 'no_path'" class="no-path-badge">未找到可行路径</div>
  </div>
</template>
