<script setup lang="ts">
import { CheckCircle2, CircleAlert, Info, X } from '@lucide/vue'
import { useToast } from '@/composables/useToast'

const { messages, remove } = useToast()
const icons = { success: CheckCircle2, error: CircleAlert, info: Info }
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="message in messages" :key="message.id" class="toast" :class="`toast--${message.tone}`">
        <component :is="icons[message.tone]" :size="18" aria-hidden="true" />
        <span>{{ message.text }}</span>
        <button aria-label="关闭提示" @click="remove(message.id)"><X :size="15" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>
