<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Crosshair, MousePointer2, Sparkles } from '@lucide/vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import LeftPanel from '@/components/layout/LeftPanel.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import GridEditor from '@/components/grid/GridEditor.vue'
import GridLegend from '@/components/grid/GridLegend.vue'
import PlaybackControls from '@/components/planner/PlaybackControls.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { plannerWorkerClient } from '@/services/plannerWorkerClient'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { usePreferencesStore } from '@/stores/preferences'

const grid = useGridStore()
const planner = usePlannerStore()
const preferences = usePreferencesStore()
const { hoveredCell } = storeToRefs(grid)

const toolNames = {
  obstacle: '绘制障碍',
  erase: '擦除单元',
  start: '设置起点',
  goal: '设置终点',
  terrain: '设置地形',
}

const currentTool = computed(() =>
  grid.activeTool === 'terrain'
    ? `设置地形 × ${grid.terrainCost}`
    : toolNames[grid.activeTool],
)

watch(
  () => grid.version,
  () => {
    const requestId = planner.invalidateForMapChange()
    if (requestId) plannerWorkerClient.cancel(requestId)
  },
)

watch(
  () => planner.selectedAlgorithm,
  () => {
    const requestId = planner.currentRequestId
    if (requestId) plannerWorkerClient.cancel(requestId)
    planner.clearResult()
  },
)
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="workspace">
      <LeftPanel />
      <section class="map-workspace">
        <header class="workspace-header">
          <div>
            <span class="eyebrow"><Sparkles :size="13" /> PATHFINDING CANVAS</span>
            <h1>探索每一条可行路径</h1>
            <p>编辑网格，选择算法，让 MoonBit 完成计算。</p>
          </div>
          <GridLegend />
        </header>
        <div class="editor-frame">
          <GridEditor />
        </div>
        <PlaybackControls />
        <footer class="canvas-status">
          <span><MousePointer2 :size="14" /> {{ currentTool }}</span>
          <span v-if="preferences.showCoordinates">
            <Crosshair :size="14" />
            {{ hoveredCell ? `${hoveredCell.x}, ${hoveredCell.y}` : '—, —' }}
          </span>
          <span>{{ grid.width }} × {{ grid.height }}</span>
          <span>{{ grid.movement === 'four_way' ? '四方向移动' : '八方向移动' }}</span>
        </footer>
      </section>
      <RightPanel />
    </main>
    <ToastContainer />
  </div>
</template>
