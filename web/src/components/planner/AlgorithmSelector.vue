<script setup lang="ts">
import { Beaker, ChevronRight } from '@lucide/vue'
import { algorithms, algorithmCategories } from '@/data/algorithms'
import { usePlannerStore } from '@/stores/planner'

const planner = usePlannerStore()
</script>

<template>
  <div class="algorithm-groups">
    <section v-for="category in algorithmCategories" :key="category" class="algorithm-group">
      <h3>{{ category }}</h3>
      <div class="algorithm-list">
        <button
          v-for="algorithm in algorithms.filter((item) => item.category === category)"
          :key="algorithm.id"
          class="algorithm-option"
          :class="{ selected: planner.selectedAlgorithm === algorithm.id }"
          :aria-pressed="planner.selectedAlgorithm === algorithm.id"
          :title="algorithm.description"
          :disabled="planner.isRunning"
          @click="planner.selectedAlgorithm = algorithm.id"
        >
          <span>
            {{ algorithm.name }}
            <small v-if="algorithm.isExperimental"><Beaker :size="12" /> 阶段版</small>
          </span>
          <ChevronRight :size="15" />
        </button>
      </div>
    </section>
  </div>
</template>
