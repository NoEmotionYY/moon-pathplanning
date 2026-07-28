<script setup lang="ts">
import { computed } from 'vue'
import type { EntranceSelectionSummary } from '@/types/mazeImportWorker'

const props = defineProps<{
  selection: EntranceSelectionSummary
}>()

const sideNames = {
  top: '顶部',
  right: '右侧',
  bottom: '底部',
  left: '左侧',
} as const

const stateNames = {
  reliable: '可靠',
  uncertain: '待确认',
  invalid: '无效',
} as const

const candidates = computed(() =>
  props.selection.candidates.map((candidate) => {
    const selectedIndex =
      props.selection.selectedCandidateIds?.indexOf(candidate.id) ?? -1
    return {
      ...candidate,
      sideLabel: sideNames[candidate.side],
      rangeLabel:
        candidate.startIndex === candidate.endIndex
          ? `第 ${candidate.startIndex + 1} 格`
          : `第 ${candidate.startIndex + 1}～${candidate.endIndex + 1} 格`,
      stateLabel: stateNames[candidate.state],
      selectedLabel:
        selectedIndex === 0
          ? '自动起点'
          : selectedIndex === 1
            ? '自动终点'
            : null,
      confidenceLabel:
        `${(Math.min(1, Math.max(0, candidate.confidence)) * 100).toFixed(1)}%`,
    }
  }),
)
</script>

<template>
  <section class="entrance-candidate-list">
    <div class="candidate-list-heading">
      <h3>入口候选</h3>
      <span>只读 · {{ candidates.length }} 个</span>
    </div>
    <p v-if="!candidates.length" class="empty-diagnostic">没有检测到入口候选。</p>
    <ul v-else>
      <li v-for="candidate in candidates" :key="candidate.id">
        <div class="candidate-title">
          <code>{{ candidate.id }}</code>
          <strong v-if="candidate.selectedLabel">{{ candidate.selectedLabel }}</strong>
        </div>
        <span>
          {{ candidate.sideLabel }}，{{ candidate.rangeLabel }}，宽
          {{ candidate.widthInCells }} 格
        </span>
        <small>
          置信度 {{ candidate.confidenceLabel }} · 连通分量
          {{ candidate.componentId ?? '—' }}（{{ candidate.componentSize }} 格）·
          {{ candidate.stateLabel }}
        </small>
      </li>
    </ul>
  </section>
</template>
