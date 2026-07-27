<script setup lang="ts">
import { Eraser, Flag, Mountain, MousePointer2, Shield, Trash2 } from '@lucide/vue'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridTool } from '@/types/grid'

defineProps<{ compact?: boolean }>()
const grid = useGridStore()
const planner = usePlannerStore()

const tools: { id: GridTool; label: string; icon: typeof Shield; shortcut: string }[] = [
  { id: 'obstacle', label: '障碍', icon: Shield, shortcut: '1' },
  { id: 'erase', label: '擦除', icon: Eraser, shortcut: '2' },
  { id: 'start', label: '起点', icon: MousePointer2, shortcut: '3' },
  { id: 'goal', label: '终点', icon: Flag, shortcut: '4' },
  { id: 'terrain', label: '地形', icon: Mountain, shortcut: '5' },
]
</script>

<template>
  <div class="grid-toolbar" :class="{ 'grid-toolbar--compact': compact }" aria-label="网格编辑工具">
    <button
      v-for="tool in tools"
      :key="tool.id"
      class="tool-button"
      :class="{ active: grid.activeTool === tool.id }"
      :aria-pressed="grid.activeTool === tool.id"
      :title="`${tool.label}（快捷键 ${tool.shortcut}）`"
      :disabled="planner.isRunning"
      @click="grid.activeTool = tool.id"
    >
      <component :is="tool.icon" :size="17" />
      <span>{{ tool.label }}</span>
    </button>
    <select
      v-if="grid.activeTool === 'terrain'"
      v-model.number="grid.terrainCost"
      class="terrain-select"
      aria-label="地形代价"
    >
      <option :value="2">中等 · 2</option>
      <option :value="4">高 · 4</option>
      <option :value="8">极高 · 8</option>
    </select>
    <button
      class="tool-button tool-button--quiet"
      title="清空障碍物"
      :disabled="planner.isRunning || !grid.obstacles.length"
      @click="grid.clearObstacles"
    >
      <Trash2 :size="17" />
      <span>清障</span>
    </button>
  </div>
</template>
