<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'default' | 'wide'
  }>(),
  { size: 'default' },
)
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section
        class="modal-card"
        :class="`modal-card--${size}`"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
          <button class="icon-button" aria-label="关闭对话框" @click="emit('close')">×</button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
