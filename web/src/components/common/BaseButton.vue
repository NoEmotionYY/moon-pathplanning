<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', loading: false, disabled: false, type: 'button' },
)
</script>

<template>
  <button
    class="base-button"
    :class="[`base-button--${variant}`, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
  >
    <span v-if="loading" class="button-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>
