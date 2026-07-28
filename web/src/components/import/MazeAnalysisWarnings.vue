<script setup lang="ts">
import { computed } from 'vue'
import type {
  MazeImportPipelineStage,
  MazeImportPipelineWarning,
} from '@/types/mazeImportPipeline'

const props = defineProps<{
  warnings: MazeImportPipelineWarning[]
}>()

const stageOrder: MazeImportPipelineStage[] = [
  'validation',
  'transform',
  'preprocess',
  'orthogonal-detection',
  'topology-analysis',
  'entrance-selection',
  'grid-conversion',
  'document-validation',
  'completed',
]

const stageNames: Record<MazeImportPipelineStage, string> = {
  validation: '图片校验',
  transform: '图片变换',
  preprocess: '墙体结构',
  'orthogonal-detection': '网格识别',
  'topology-analysis': '拓扑分析',
  'entrance-selection': '入口检测',
  'grid-conversion': '地图转换',
  'document-validation': '地图校验',
  completed: '分析完成',
}

const groups = computed(() => {
  const unique = new Map<string, MazeImportPipelineWarning>()
  for (const warning of props.warnings) {
    const key = `${warning.stage}\u0000${warning.code}\u0000${warning.message}`
    if (!unique.has(key)) unique.set(key, warning)
  }
  return stageOrder
    .map((stage) => ({
      stage,
      label: stageNames[stage],
      warnings: [...unique.values()].filter(
        (warning) => warning.stage === stage,
      ),
    }))
    .filter((group) => group.warnings.length > 0)
})

const warningCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.warnings.length, 0),
)
</script>

<template>
  <section v-if="warningCount" class="maze-analysis-warnings">
    <h3>分析警告 <span>{{ warningCount }}</span></h3>
    <details :open="warningCount <= 4">
      <summary>{{ warningCount <= 4 ? '诊断详情' : '展开全部警告' }}</summary>
      <div class="warning-groups">
        <section v-for="group in groups" :key="group.stage">
          <h4>{{ group.label }}</h4>
          <ul>
            <li v-for="warning in group.warnings" :key="`${warning.code}:${warning.message}`">
              <span>{{ warning.message }}</span>
              <code>{{ warning.code }}</code>
            </li>
          </ul>
        </section>
      </div>
    </details>
  </section>
</template>
