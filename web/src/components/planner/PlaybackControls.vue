<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { Pause, Play, RotateCcw, StepBack, StepForward } from '@lucide/vue'
import { PLAYBACK_SPEEDS, usePlayback } from '@/composables/usePlayback'
import { usePlannerStore } from '@/stores/planner'
import { usePreferencesStore } from '@/stores/preferences'

const planner = usePlannerStore()
const preferences = usePreferencesStore()
const playback = usePlayback()

const displayedStep = computed(() =>
  planner.currentEventIndex < 0 ? 0 : planner.currentEventIndex + 1,
)
const traceUnavailable = computed(() =>
  Boolean(planner.result && !planner.traceSupported),
)

const toggle = () => {
  if (playback.isPlaying.value) playback.pause()
  else if (playback.isPaused.value) playback.resume()
  else playback.play()
}

const seekFromInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  playback.seek(value - 1)
}

const handleKeyboard = (event: KeyboardEvent) => {
  const target = event.target
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return
  }
  if (event.code === 'Space') {
    event.preventDefault()
    toggle()
  } else if (event.code === 'ArrowRight' && playback.canPlayback.value) {
    event.preventDefault()
    playback.stepForward()
  } else if (event.code === 'ArrowLeft' && playback.canPlayback.value) {
    event.preventDefault()
    playback.stepBackward()
  }
}

watch(
  () => planner.playbackStatus,
  (status) => {
    if (status === 'ready') playback.play()
  },
)

onMounted(() => window.addEventListener('keydown', handleKeyboard))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboard))
</script>

<template>
  <section
    v-if="playback.canPlayback.value || traceUnavailable"
    class="playback-panel"
    aria-label="搜索过程回放控制"
  >
    <div class="playback-heading">
      <div>
        <strong>搜索回放（MoonBit 记录）</strong>
        <span v-if="playback.canPlayback.value">
          第 {{ displayedStep }} / {{ planner.traceTotalSteps }} 步
        </span>
        <span v-else>当前算法暂不提供逐步搜索记录，最终路径仍可正常显示。</span>
      </div>
      <label v-if="playback.canPlayback.value" class="path-visibility-toggle">
        <input v-model="preferences.showPathDuringTrace" type="checkbox">
        搜索时显示最终路径
      </label>
    </div>

    <template v-if="playback.canPlayback.value">
      <div class="playback-controls">
        <button type="button" title="重新播放" aria-label="重新播放" @click="playback.reset(); playback.play()">
          <RotateCcw :size="15" />
        </button>
        <button type="button" title="上一步" aria-label="上一步" @click="playback.stepBackward">
          <StepBack :size="15" />
        </button>
        <button
          type="button"
          class="playback-primary"
          :title="playback.isPlaying.value ? '暂停' : '播放'"
          :aria-label="playback.isPlaying.value ? '暂停' : '播放'"
          @click="toggle"
        >
          <Pause v-if="playback.isPlaying.value" :size="16" />
          <Play v-else :size="16" />
        </button>
        <button type="button" title="下一步" aria-label="下一步" @click="playback.stepForward">
          <StepForward :size="15" />
        </button>
        <input
          class="playback-range"
          type="range"
          min="0"
          :max="planner.traceTotalSteps"
          :value="displayedStep"
          aria-label="搜索回放进度"
          @input="seekFromInput"
        >
        <div class="playback-speeds" aria-label="回放速度">
          <button
            v-for="speed in PLAYBACK_SPEEDS"
            :key="speed"
            type="button"
            :class="{ active: planner.playbackSpeed === speed }"
            @click="playback.setSpeed(speed)"
          >
            {{ speed }}×
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
