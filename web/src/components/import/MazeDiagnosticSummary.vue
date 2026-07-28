<script setup lang="ts">
import { computed } from 'vue'
import type { MazeImportDiagnosticSummary } from '@/types/mazeImportPipeline'

const props = defineProps<{
  diagnostics: MazeImportDiagnosticSummary
}>()

const formatSize = (
  width: number | null,
  height: number | null,
): string =>
  width === null || height === null ? '—' : `${width} × ${height}`

const formatConfidence = (value: number | null): string =>
  value === null
    ? '—'
    : `${(Math.min(1, Math.max(0, value)) * 100).toFixed(1)}%`

const entranceLabels = {
  selected: '已自动选择',
  none: '没有可靠入口',
  single: '仅检测到一个入口',
  ambiguous: '存在多个候选入口',
  disconnected: '入口不在同一连通区域',
  'low-confidence': '入口可信度不足',
  'topology-unavailable': '拓扑不可用',
} as const

const rows = computed(() => {
  const value = props.diagnostics
  return [
    ['原始图片', formatSize(value.sourceWidth, value.sourceHeight)],
    ['变换后图片', formatSize(value.transformedWidth, value.transformedHeight)],
    ['裁剪区域', formatSize(value.croppedWidth, value.croppedHeight)],
    [
      '逻辑迷宫',
      value.detectedColumns === null || value.detectedRows === null
        ? '—'
        : `${value.detectedColumns} 列 × ${value.detectedRows} 行`,
    ],
    ['转换地图', formatSize(value.convertedWidth, value.convertedHeight)],
    ['正交置信度', formatConfidence(value.orthogonalConfidence)],
    ['拓扑置信度', formatConfidence(value.topologyConfidence)],
    [
      '入口状态',
      value.entranceStatus
        ? entranceLabels[value.entranceStatus]
        : '—',
    ],
    ['入口候选', String(value.entranceCandidateCount)],
    ['障碍格', value.obstacleCount === null ? '—' : String(value.obstacleCount)],
    ['可通行格', value.walkableCount === null ? '—' : String(value.walkableCount)],
  ]
})
</script>

<template>
  <section class="maze-diagnostic-summary">
    <h3>诊断摘要</h3>
    <dl>
      <div v-for="[label, value] in rows" :key="label">
        <dt>{{ label }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
  </section>
</template>
