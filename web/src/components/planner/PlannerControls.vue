<script setup lang="ts">
import { Play, RotateCcw, Trash2 } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { usePlanner } from '@/composables/usePlanner'

const grid = useGridStore()
const planner = usePlannerStore()
const { run } = usePlanner()
</script>

<template>
  <div class="planner-controls">
    <BaseButton variant="primary" :loading="planner.isRunning" @click="run">
      <Play v-if="!planner.isRunning" :size="17" fill="currentColor" />
      {{ planner.isRunning ? '正在计算…' : '运行规划' }}
    </BaseButton>
    <div class="secondary-controls">
      <BaseButton variant="ghost" :disabled="planner.isRunning || !planner.result" @click="planner.clearResult">
        <Trash2 :size="15" /> 清除路径
      </BaseButton>
      <BaseButton variant="ghost" :disabled="planner.isRunning" @click="grid.reset(); planner.clearResult()">
        <RotateCcw :size="15" /> 重置
      </BaseButton>
    </div>
  </div>
</template>
