<script setup lang="ts">
import { BarChart3 } from '@lucide/vue'
import ResultMetrics from '@/components/result/ResultMetrics.vue'
</script>

<template>
  <aside class="side-panel right-panel">
    <div class="panel-title">
      <BarChart3 :size="18" />
      <div><h2>运行结果</h2><span>实时指标与状态</span></div>
    </div>
    <ResultMetrics />
  </aside>
</template>
