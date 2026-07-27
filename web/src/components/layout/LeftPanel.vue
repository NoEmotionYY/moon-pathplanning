<script setup lang="ts">
import { ref } from 'vue'
import { Download, FileUp, Grid3X3, MapPinned, SlidersHorizontal } from '@lucide/vue'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { useMapImportExport, type ExampleName } from '@/composables/useMapImportExport'
import { useToast } from '@/composables/useToast'
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from '@/utils/validation'
import AlgorithmSelector from '@/components/planner/AlgorithmSelector.vue'
import GridToolbar from '@/components/grid/GridToolbar.vue'
import PlannerControls from '@/components/planner/PlannerControls.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const grid = useGridStore()
const planner = usePlannerStore()
const fileInput = ref<HTMLInputElement | null>(null)
const { importFile, exportMap, loadExample, exampleNames } = useMapImportExport()
const { show } = useToast()
const nextWidth = ref(grid.width)
const nextHeight = ref(grid.height)
const selectedExample = ref<ExampleName>('simple_grid')

const applySize = () => {
  const width = Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(nextWidth.value)))
  const height = Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(nextHeight.value)))
  nextWidth.value = width
  nextHeight.value = height
  grid.resize(width, height)
}

const handleFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await importFile(file)
    nextWidth.value = grid.width
    nextHeight.value = grid.height
  } catch (error) {
    show(error instanceof Error ? error.message : '导入地图失败', 'error')
  } finally {
    input.value = ''
  }
}

const openExample = async () => {
  try {
    await loadExample(selectedExample.value)
    nextWidth.value = grid.width
    nextHeight.value = grid.height
  } catch (error) {
    show(error instanceof Error ? error.message : '示例加载失败', 'error')
  }
}
</script>

<template>
  <aside class="side-panel left-panel">
    <section class="panel-section">
      <div class="section-heading">
        <Grid3X3 :size="17" />
        <div><h2>地图设置</h2><span>{{ grid.width }} × {{ grid.height }} 网格</span></div>
      </div>
      <div class="size-controls">
        <label>宽度<input v-model.number="nextWidth" type="number" :min="MIN_GRID_SIZE" :max="MAX_GRID_SIZE" :disabled="planner.isRunning" /></label>
        <span>×</span>
        <label>高度<input v-model.number="nextHeight" type="number" :min="MIN_GRID_SIZE" :max="MAX_GRID_SIZE" :disabled="planner.isRunning" /></label>
        <button aria-label="应用地图尺寸" :disabled="planner.isRunning" @click="applySize">应用</button>
      </div>
      <label class="select-label">
        移动方式
        <select v-model="grid.movement" :disabled="planner.isRunning">
          <option value="four_way">四方向</option>
          <option value="eight_way">八方向</option>
        </select>
      </label>
    </section>

    <section class="panel-section">
      <div class="section-heading">
        <SlidersHorizontal :size="17" />
        <div><h2>编辑工具</h2><span>拖动可连续绘制</span></div>
      </div>
      <GridToolbar />
    </section>

    <section class="panel-section panel-section--grow">
      <div class="section-heading">
        <MapPinned :size="17" />
        <div><h2>规划算法</h2><span>12 种 MoonBit 实现</span></div>
      </div>
      <AlgorithmSelector />
    </section>

    <section class="panel-section">
      <div class="section-heading compact">
        <FileUp :size="17" />
        <div><h2>地图文件</h2></div>
      </div>
      <div class="example-row">
        <label class="sr-only" for="example-map">示例地图</label>
        <select id="example-map" v-model="selectedExample" :disabled="planner.isRunning">
          <option v-for="name in exampleNames" :key="name" :value="name">{{ name }}</option>
        </select>
        <button :disabled="planner.isRunning" @click="openExample">加载</button>
      </div>
      <div class="file-actions">
        <BaseButton variant="ghost" :disabled="planner.isRunning" @click="fileInput?.click()">
          <FileUp :size="15" /> 导入
        </BaseButton>
        <BaseButton variant="ghost" @click="exportMap"><Download :size="15" /> 导出</BaseButton>
      </div>
      <input ref="fileInput" class="sr-only" type="file" accept=".json,application/json" @change="handleFile" />
    </section>
    <PlannerControls />
  </aside>
</template>
