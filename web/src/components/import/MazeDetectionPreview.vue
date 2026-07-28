<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import type { ManualEntranceSelection } from '@/types/mazeImportSelection'
import { renderMazeDetectionPreview } from '@/services/import/mazeDetectionPreviewRenderer'
import { renderGridDocumentPreview } from '@/services/import/gridDocumentPreviewRenderer'

const props = defineProps<{
  result: MazeImportWorkerResult
  theme: 'dark' | 'light'
  pendingSelection?: ManualEntranceSelection | null
}>()

const activeView = ref<'detection' | 'grid'>('detection')
const surface = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const preview = computed(() =>
  props.result.detail === 'preview' ? props.result.preview : null,
)
const canShowGrid = computed(() => props.result.document !== null)
const appliedCandidateIds = computed<[string, string] | null>(() => {
  const conversion = props.result.conversion
  if (conversion?.startCandidateId && conversion.goalCandidateId) {
    return [
      conversion.startCandidateId,
      conversion.goalCandidateId,
    ]
  }
  return props.result.entranceSelection?.selectedCandidateIds ?? null
})

const cssColor = (
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string => styles.getPropertyValue(name).trim() || fallback

const draw = async (): Promise<void> => {
  await nextTick()
  const host = surface.value
  const target = canvas.value
  if (!host || !target) return
  const styles = getComputedStyle(host)
  const width = Math.max(240, host.clientWidth)
  const height = Math.max(240, Math.min(430, host.clientHeight || 360))
  const devicePixelRatio = window.devicePixelRatio || 1
  if (activeView.value === 'grid' && props.result.document) {
    renderGridDocumentPreview(target, props.result.document, {
      width,
      height,
      devicePixelRatio,
      colors: {
        background: cssColor(styles, '--import-preview-bg', '#091624'),
        walkable: cssColor(styles, '--grid-cell', '#0f1d30'),
        obstacle: cssColor(styles, '--obstacle-fill', '#34455d'),
        grid: cssColor(styles, '--grid-line', 'rgba(132,157,188,.22)'),
        start: cssColor(styles, '--start-fill', '#35d399'),
        goal: cssColor(styles, '--goal-fill', '#fb7185'),
      },
    })
    return
  }
  if (preview.value) {
    renderMazeDetectionPreview(target, preview.value, {
      width,
      height,
      devicePixelRatio,
      selectedCandidateIds: appliedCandidateIds.value,
      pendingCandidateIds: props.pendingSelection
        ? [
            props.pendingSelection.startCandidateId,
            props.pendingSelection.goalCandidateId,
          ]
        : null,
      colors: {
        background: cssColor(styles, '--import-preview-bg', '#091624'),
        wall: cssColor(styles, '--obstacle-fill', '#34455d'),
        grid: cssColor(styles, '--grid-line-strong', 'rgba(148,181,219,.36)'),
        open: cssColor(styles, '--success', '#35d399'),
        uncertain: cssColor(styles, '--warning', '#fbbf24'),
        entrance: cssColor(styles, '--accent', '#43c7f4'),
        start: cssColor(styles, '--start-fill', '#35d399'),
        goal: cssColor(styles, '--goal-fill', '#fb7185'),
      },
    })
  }
}

watch(
  () => [props.result, props.theme, activeView.value],
  () => void draw(),
  { flush: 'post' },
)

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && surface.value) {
    resizeObserver = new ResizeObserver(() => void draw())
    resizeObserver.observe(surface.value)
  }
  void draw()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="maze-detection-preview">
    <div class="detection-preview-tabs" role="tablist" aria-label="识别预览">
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'detection'"
        :class="{ active: activeView === 'detection' }"
        :disabled="!preview"
        @click="activeView = 'detection'"
      >
        结构识别
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'grid'"
        :class="{ active: activeView === 'grid' }"
        :disabled="!canShowGrid"
        @click="activeView = 'grid'"
      >
        转换地图
      </button>
    </div>
    <div ref="surface" class="detection-preview-surface">
      <canvas
        v-if="preview || canShowGrid"
        ref="canvas"
        :aria-label="activeView === 'grid' ? '转换地图只读预览' : '迷宫结构识别只读预览'"
      />
      <p v-else>当前结果没有可用的预览数据。</p>
    </div>
    <div v-if="activeView === 'detection'" class="detection-preview-legend">
      <span class="wall">墙体</span>
      <span class="open">通道</span>
      <span class="uncertain">不确定</span>
      <span class="entrance">入口候选</span>
      <span class="start">起点</span>
      <span class="goal">终点</span>
    </div>
    <p class="readonly-preview-note">只读预览，不会调用 Planner 或修改地图。</p>
  </section>
</template>
