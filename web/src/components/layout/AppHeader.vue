<script setup lang="ts">
import { GitFork, MoonStar, Sun, Workflow } from '@lucide/vue'
import { usePreferencesStore } from '@/stores/preferences'

const preferences = usePreferencesStore()
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"><Workflow :size="22" /></div>
      <div>
        <strong>Moon PathPlanning</strong>
        <span>交互式路径规划实验室</span>
      </div>
    </div>
    <div class="header-actions">
      <span class="engine-badge"><i /> MoonBit Engine</span>
      <a
        class="icon-button"
        href="https://github.com/NoEmotionYY/moon-pathplanning"
        target="_blank"
        rel="noreferrer"
        aria-label="在 GitHub 查看项目"
      >
        <GitFork :size="19" />
      </a>
      <button
        class="icon-button"
        :aria-label="preferences.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
        @click="preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark'"
      >
        <Sun v-if="preferences.theme === 'dark'" :size="19" />
        <MoonStar v-else :size="19" />
      </button>
    </div>
  </header>
</template>
