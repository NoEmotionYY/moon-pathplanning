<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  MazeImportPipelineProgress,
  MazeImportPipelineStage,
} from '@/types/mazeImportPipeline'
import BaseButton from '@/components/common/BaseButton.vue'

const props = defineProps<{
  progress: MazeImportPipelineProgress | null
  action?: 'analyze' | 'apply-selection'
}>()
defineEmits<{ cancel: [] }>()

const stageNames: Record<MazeImportPipelineStage, string> = {
  validation: '校验图片',
  transform: '应用图片变换',
  preprocess: '提取墙体结构',
  'orthogonal-detection': '识别迷宫网格',
  'topology-analysis': '分析通道和墙体',
  'entrance-selection': '检测入口和出口',
  'grid-conversion': '生成路径规划地图',
  'document-validation': '校验地图',
  completed: '分析完成',
}

const maximumProgress = ref(0)
watch(
  () => props.progress?.progress ?? 0,
  (value) => {
    maximumProgress.value = Math.max(
      maximumProgress.value,
      Math.min(1, Math.max(0, value)),
    )
  },
  { immediate: true },
)
const percent = computed(() => Math.round(maximumProgress.value * 100))
const stageName = computed(() =>
  props.progress ? stageNames[props.progress.stage] : '正在启动分析',
)
</script>

<template>
  <section class="maze-analysis-progress" aria-live="polite">
    <div class="analysis-progress-heading">
      <div>
        <span>
          {{
            action === 'apply-selection'
              ? '正在应用入口选择'
              : '正在识别迷宫'
          }}
        </span>
        <strong>{{ stageName }}</strong>
      </div>
      <strong>{{ percent }}%</strong>
    </div>
    <progress :value="percent" max="100">{{ percent }}%</progress>
    <p>分析在独立 Worker 中运行，不会修改当前地图。</p>
    <BaseButton variant="ghost" @click="$emit('cancel')">
      {{ action === 'apply-selection' ? '取消应用' : '取消识别' }}
    </BaseButton>
  </section>
</template>
