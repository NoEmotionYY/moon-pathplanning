<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'default' | 'wide'
    closeDisabled?: boolean
  }>(),
  { size: 'default', closeDisabled: false },
)
const emit = defineEmits<{ close: [] }>()

const requestClose = () => {
  if (!props.closeDisabled) emit('close')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) requestClose()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="requestClose">
      <section
        class="modal-card"
        :class="`modal-card--${size}`"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
          <button
            class="icon-button"
            aria-label="关闭对话框"
            :disabled="closeDisabled"
            @click="requestClose"
          >
            ×
          </button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
