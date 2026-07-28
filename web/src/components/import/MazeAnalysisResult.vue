<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, CircleAlert, CircleHelp, XCircle } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { MazeImportError } from '@/types/import'
import type {
  EntranceRole,
  EntranceSelectionSource,
  ManualEntranceSelection,
  ManualEntranceSelectionValidation,
} from '@/types/mazeImportSelection'
import type { MazeImportAnalysisStatus } from '@/composables/useMazeImportAnalysis'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import MazeDiagnosticSummary from './MazeDiagnosticSummary.vue'
import MazeAnalysisWarnings from './MazeAnalysisWarnings.vue'
import EntranceCandidateList from './EntranceCandidateList.vue'

const props = defineProps<{
  status: MazeImportAnalysisStatus
  result: MazeImportWorkerResult | null
  error: MazeImportError | null
  canSelectEntrances?: boolean
  canApplyManualSelection?: boolean
  manualSelection?: ManualEntranceSelection
  manualSelectionValidation?: ManualEntranceSelectionValidation
  needsLowConfidenceConfirmation?: boolean
  entranceSelectionSource?: EntranceSelectionSource
  appliedEntranceSelection?: ManualEntranceSelection | null
  disabled?: boolean
}>()
const emit = defineEmits<{
  selectEntrance: [role: EntranceRole, candidateId: string]
  clearSelection: []
  swapSelection: []
  applySelection: []
  confirmLowConfidence: []
  cancelLowConfidence: []
  swapApplied: []
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

const hasManualChoice = computed(
  () =>
    Boolean(
      props.manualSelection?.startCandidateId ||
      props.manualSelection?.goalCandidateId,
    ),
)

const candidateName = (id: string | null | undefined): string => {
  if (!id) return '未选择'
  const candidate = props.result?.entranceSelection?.candidates.find(
    (item) => item.id === id,
  )
  return candidate ? candidate.id : id
}

const resultRoleSummary = computed(() => {
  const selection = props.appliedEntranceSelection
  if (!selection?.startCandidateId || !selection.goalCandidateId) return null
  return {
    source: props.entranceSelectionSource === 'manual'
      ? '用户选择'
      : '自动识别',
    start: candidateName(selection.startCandidateId),
    goal: candidateName(selection.goalCandidateId),
  }
})
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
      :mode="canSelectEntrances ? 'select' : 'readonly'"
      :manual-selection="manualSelection"
      @select="
        (role, candidateId) =>
          emit('selectEntrance', role, candidateId)
      "
    />
    <section
      v-if="canSelectEntrances"
      class="manual-entrance-actions"
      aria-label="手动入口选择"
    >
      <div class="manual-selection-summary">
        <span>起点：<code>{{ candidateName(manualSelection?.startCandidateId) }}</code></span>
        <span>终点：<code>{{ candidateName(manualSelection?.goalCandidateId) }}</code></span>
      </div>
      <p
        v-if="manualSelectionValidation?.warnings.length"
        class="manual-selection-warning"
        aria-live="polite"
      >
        {{ manualSelectionValidation.warnings[0] }}
      </p>
      <div class="manual-selection-buttons">
        <BaseButton
          variant="ghost"
          :disabled="disabled || !hasManualChoice"
          @click="emit('clearSelection')"
        >
          清空选择
        </BaseButton>
        <BaseButton
          variant="secondary"
          :disabled="
            disabled ||
            !manualSelection?.startCandidateId ||
            !manualSelection?.goalCandidateId
          "
          @click="emit('swapSelection')"
        >
          交换起点终点
        </BaseButton>
        <BaseButton
          variant="primary"
          :disabled="disabled || !canApplyManualSelection"
          @click="emit('applySelection')"
        >
          应用入口选择
        </BaseButton>
      </div>
      <div
        v-if="needsLowConfidenceConfirmation"
        class="low-confidence-confirmation"
        role="alert"
      >
        <p>
          该入口对置信度较低，可能生成不准确的地图。是否仍然使用？
        </p>
        <div>
          <BaseButton
            variant="primary"
            :disabled="disabled"
            @click="emit('confirmLowConfidence')"
          >
            仍然使用
          </BaseButton>
          <BaseButton
            variant="ghost"
            :disabled="disabled"
            @click="emit('cancelLowConfidence')"
          >
            取消
          </BaseButton>
        </div>
      </div>
    </section>
    <section
      v-if="status === 'success' && resultRoleSummary"
      class="entrance-result-summary"
      aria-label="入口应用结果"
    >
      <div>
        <strong>{{ resultRoleSummary.source }}</strong>
        <span>起点：<code>{{ resultRoleSummary.start }}</code></span>
        <span>终点：<code>{{ resultRoleSummary.goal }}</code></span>
      </div>
      <BaseButton
        variant="secondary"
        :disabled="disabled"
        @click="emit('swapApplied')"
      >
        交换起点终点
      </BaseButton>
    </section>
    <p v-if="status === 'success'" class="analysis-next-stage-note">
      结果仅供预览，尚未写入当前地图。
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
