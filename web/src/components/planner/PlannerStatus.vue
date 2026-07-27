<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck, Clock3, LoaderCircle, RefreshCw, RouteOff } from '@lucide/vue'
import { usePlannerStore } from '@/stores/planner'

const planner = usePlannerStore()

const statusView = computed(() => {
  const views = {
    idle: { label: '等待运行', detail: '设置地图后选择算法开始规划', icon: Clock3 },
    running: { label: '正在计算', detail: 'MoonBit 引擎正在搜索可行路径', icon: LoaderCircle },
    found: { label: '规划成功', detail: '已在网格中绘制最终路径', icon: CircleCheck },
    no_path: { label: '没有路径', detail: '调整障碍物或移动方式后重试', icon: RouteOff },
    invalid_input: { label: '输入无效', detail: planner.error?.message ?? '请检查地图设置', icon: CircleAlert },
    error: { label: '计算失败', detail: planner.error?.message ?? '规划服务发生异常', icon: CircleAlert },
    stale: { label: '结果已过期', detail: '地图已修改，请重新运行规划', icon: RefreshCw },
  }
  return views[planner.status]
})
</script>

<template>
  <div class="planner-status" :class="`status--${planner.status}`">
    <component :is="statusView.icon" :size="22" :class="{ spinning: planner.isRunning }" />
    <div>
      <strong>{{ statusView.label }}</strong>
      <span>{{ statusView.detail }}</span>
    </div>
  </div>
</template>
