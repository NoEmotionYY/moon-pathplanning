<script setup lang="ts">
import { AlertTriangle, Route } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type {
  MazeImportConfirmationSummary,
} from '@/types/mazeImportApplication'

defineProps<{
  summary: MazeImportConfirmationSummary
  applying: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <section
    class="maze-import-confirmation"
    aria-label="确认替换迷宫地图"
  >
    <div class="maze-import-confirmation__heading">
      <AlertTriangle :size="22" aria-hidden="true" />
      <div>
        <h3>即将替换当前地图</h3>
        <p>请确认识别结果与入口方向正确。</p>
      </div>
    </div>

    <dl class="maze-import-confirmation__summary">
      <div>
        <dt>新地图尺寸</dt>
        <dd>{{ summary.width }} × {{ summary.height }}</dd>
      </div>
      <div>
        <dt>障碍物</dt>
        <dd>{{ summary.obstacleCount }}</dd>
      </div>
      <div>
        <dt>地形单元</dt>
        <dd>{{ summary.terrainCount }}</dd>
      </div>
      <div>
        <dt>起点</dt>
        <dd>({{ summary.start[0] }}, {{ summary.start[1] }})</dd>
      </div>
      <div>
        <dt>终点</dt>
        <dd>({{ summary.goal[0] }}, {{ summary.goal[1] }})</dd>
      </div>
      <div>
        <dt>移动方式</dt>
        <dd>
          {{ summary.movement === 'four_way' ? '四方向' : '八方向' }}
        </dd>
      </div>
    </dl>

    <div class="maze-import-confirmation__effects">
      <strong><Route :size="16" />导入后将：</strong>
      <ul>
        <li>取消当前正在运行的路径规划</li>
        <li>清除旧路径和搜索回放</li>
        <li>保留当前算法选择</li>
        <li>保留搜索回放倍速</li>
      </ul>
      <small>原地图版本：{{ summary.previousMapVersion }}</small>
    </div>

    <div class="maze-import-confirmation__actions">
      <BaseButton
        variant="ghost"
        :disabled="applying"
        @click="emit('cancel')"
      >
        返回预览
      </BaseButton>
      <BaseButton
        variant="primary"
        :loading="applying"
        :disabled="applying"
        @click="emit('confirm')"
      >
        {{ applying ? '正在导入地图…' : '确认替换地图' }}
      </BaseButton>
    </div>
  </section>
</template>
