<script setup lang="ts">
import { computed } from 'vue'
import { getAlgorithm } from '@/data/algorithms'
import { usePlannerStore } from '@/stores/planner'
import MetricCard from './MetricCard.vue'
import PlannerStatus from '@/components/planner/PlannerStatus.vue'

const planner = usePlannerStore()
const display = (value: number | null | undefined) => (value == null ? '—' : value)
const algorithmName = computed(
  () => getAlgorithm(planner.result?.algorithm ?? planner.selectedAlgorithm)?.name ?? '—',
)
</script>

<template>
  <div class="result-panel-content">
    <PlannerStatus />
    <div class="metrics-grid">
      <MetricCard label="算法" :value="algorithmName" hint="MoonBit 实现" />
      <MetricCard label="路径节点" :value="display(planner.result?.pathNodes)" hint="包含起终点" />
      <MetricCard label="总代价" :value="display(planner.result?.totalCost)" hint="按地形累计" />
      <MetricCard label="运行时间" :value="planner.executionTime == null ? '—' : `${planner.executionTime.toFixed(2)} ms`" hint="前端端到端" />
      <MetricCard label="访问节点" :value="display(planner.result?.visitedNodes)" />
      <MetricCard label="展开节点" :value="display(planner.result?.expandedNodes)" />
      <MetricCard label="迭代次数" :value="display(planner.result?.iterations)" />
      <MetricCard label="采样树节点" :value="display(planner.result?.treeNodes)" />
    </div>
    <div class="result-note">
      <strong>结构化结果</strong>
      <p>页面通过 Web Worker 调用 MoonBit Bridge；经典搜索轨迹由 MoonBit 真实记录。</p>
    </div>
  </div>
</template>
