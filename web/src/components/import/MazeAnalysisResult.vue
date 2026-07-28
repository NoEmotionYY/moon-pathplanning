<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, CircleAlert, CircleHelp, XCircle } from '@lucide/vue'
import type { MazeImportError } from '@/types/import'
import type { MazeImportAnalysisStatus } from '@/composables/useMazeImportAnalysis'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import MazeDiagnosticSummary from './MazeDiagnosticSummary.vue'
import MazeAnalysisWarnings from './MazeAnalysisWarnings.vue'
import EntranceCandidateList from './EntranceCandidateList.vue'

const props = defineProps<{
  status: MazeImportAnalysisStatus
  result: MazeImportWorkerResult | null
  error: MazeImportError | null
}>()

const manualMessages = {
  none: '没有检测到可靠入口。',
  single: '只检测到一个入口。',
  ambiguous: '检测到多个入口，需要手动选择。',
  'low-confidence': '入口可信度不足。',
  disconnected: '候选入口不在同一连通区域。',
  'topology-unavailable': '当前拓扑无法用于入口检测。',
  selected: '入口已自动选择。',
} as const

const title = computed(() => {
  if (props.status === 'success') return '迷宫识别成功'
  if (props.status === 'manual-input-required') return '需要确认迷宫入口'
  if (props.status === 'unsupported-topology') {
    return '当前图片未被可靠识别为正交矩形迷宫'
  }
  if (props.status === 'failed') return '迷宫识别失败'
  return '识别已取消'
})

const description = computed(() => {
  if (props.status === 'success') {
    return '识别结果仅用于预览，当前地图尚未被修改。'
  }
  if (props.status === 'manual-input-required') {
    const entranceStatus = props.result?.diagnostics.entranceStatus
    return entranceStatus
      ? manualMessages[entranceStatus]
      : '入口信息需要人工确认。'
  }
  if (props.status === 'unsupported-topology') {
    return '可尝试调整图片方向、反色，或裁剪源图片后重新识别。'
  }
  if (props.status === 'failed') {
    return props.error?.message ?? props.result?.error?.message ?? '识别过程中发生错误。'
  }
  return '可以返回图片步骤重新识别。'
})

const icon = computed(() => {
  if (props.status === 'success') return CheckCircle2
  if (props.status === 'manual-input-required') return CircleHelp
  if (props.status === 'unsupported-topology') return CircleAlert
  return XCircle
})

const tone = computed(() =>
  props.status === 'success'
    ? 'success'
    : props.status === 'failed'
      ? 'danger'
      : 'warning',
)
</script>

<template>
  <div class="maze-analysis-result">
    <section class="analysis-result-hero" :class="`is-${tone}`">
      <component :is="icon" :size="22" aria-hidden="true" />
      <div>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
        <code v-if="status === 'failed' && (error?.code || result?.error?.code)">
          {{ error?.code ?? result?.error?.code }}
        </code>
      </div>
    </section>

    <MazeDiagnosticSummary
      v-if="result"
      :diagnostics="result.diagnostics"
    />
    <EntranceCandidateList
      v-if="result?.entranceSelection"
      :selection="result.entranceSelection"
    />
    <p
      v-if="status === 'manual-input-required'"
      class="analysis-next-stage-note"
    >
      入口手动选择将在下一阶段开放。
    </p>
    <p v-if="status === 'success'" class="analysis-next-stage-note">
      下一阶段将支持确认导入和手动修正。
    </p>
    <MazeAnalysisWarnings
      v-if="result"
      :warnings="result.warnings"
    />
    <div v-if="result" class="analysis-duration">
      总耗时 {{ result.totalDurationMs.toFixed(1) }} ms
    </div>
  </div>
</template>
