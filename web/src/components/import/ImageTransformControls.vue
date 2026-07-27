<script setup lang="ts">
import {
  Contrast,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  Undo2,
} from '@lucide/vue'
import type { ImageTransformState } from '@/types/import'

defineProps<{
  state: ImageTransformState
  disabled: boolean
}>()
defineEmits<{
  rotateLeft: []
  rotateRight: []
  flipHorizontal: []
  flipVertical: []
  invert: []
  reset: []
}>()
</script>

<template>
  <div class="image-transform-controls" aria-label="图片变换">
    <button type="button" :disabled="disabled" @click="$emit('rotateLeft')">
      <RotateCcw :size="15" />左转 90°
    </button>
    <button type="button" :disabled="disabled" @click="$emit('rotateRight')">
      <RotateCw :size="15" />右转 90°
    </button>
    <button
      type="button"
      :disabled="disabled"
      :class="{ active: state.flipHorizontal }"
      @click="$emit('flipHorizontal')"
    >
      <FlipHorizontal2 :size="15" />水平翻转
    </button>
    <button
      type="button"
      :disabled="disabled"
      :class="{ active: state.flipVertical }"
      @click="$emit('flipVertical')"
    >
      <FlipVertical2 :size="15" />垂直翻转
    </button>
    <button
      type="button"
      :disabled="disabled"
      :class="{ active: state.invert }"
      @click="$emit('invert')"
    >
      <Contrast :size="15" />反色
    </button>
    <button type="button" :disabled="disabled" @click="$emit('reset')">
      <Undo2 :size="15" />恢复原始
    </button>
  </div>
</template>
