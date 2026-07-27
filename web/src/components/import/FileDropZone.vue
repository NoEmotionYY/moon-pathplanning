<script setup lang="ts">
import { ref } from 'vue'
import { FileUp } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    accept: string
    label: string
    hint: string
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ select: [file: File] }>()

const input = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
let dragDepth = 0

const openPicker = () => {
  if (!props.disabled) input.value?.click()
}

const emitFirstFile = (files: FileList | null) => {
  const file = files?.[0]
  if (file) emit('select', file)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emitFirstFile(target.files)
  target.value = ''
}

const handleDragEnter = () => {
  if (props.disabled) return
  dragDepth += 1
  isDragging.value = true
}

const handleDragLeave = () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  dragDepth = 0
  isDragging.value = false
  if (!props.disabled) emitFirstFile(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div
    class="file-drop-zone"
    :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    @click="openPicker"
    @keydown.enter.prevent="openPicker"
    @keydown.space.prevent="openPicker"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <FileUp :size="24" aria-hidden="true" />
    <strong>{{ label }}</strong>
    <span>{{ hint }}</span>
    <input
      ref="input"
      class="sr-only"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      :accept="accept"
      :disabled="disabled"
      @click.stop
      @change="handleInput"
    >
  </div>
</template>
