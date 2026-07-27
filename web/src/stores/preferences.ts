import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

type Theme = 'dark' | 'light'

interface StoredPreferences {
  theme: Theme
  animationSpeed: number
  panelCollapsed: boolean
  showCoordinates: boolean
  showPathDuringTrace: boolean
}

const storageKey = 'moon-pathplanning.preferences.v1'

const readPreferences = (): StoredPreferences => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<StoredPreferences>
    return {
      theme: stored.theme === 'light' ? 'light' : 'dark',
      animationSpeed: typeof stored.animationSpeed === 'number' ? stored.animationSpeed : 1,
      panelCollapsed: Boolean(stored.panelCollapsed),
      showCoordinates: stored.showCoordinates !== false,
      showPathDuringTrace: Boolean(stored.showPathDuringTrace),
    }
  } catch {
    return {
      theme: 'dark',
      animationSpeed: 1,
      panelCollapsed: false,
      showCoordinates: true,
      showPathDuringTrace: false,
    }
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = readPreferences()
  const theme = ref<Theme>(initial.theme)
  const animationSpeed = ref(initial.animationSpeed)
  const panelCollapsed = ref(initial.panelCollapsed)
  const showCoordinates = ref(initial.showCoordinates)
  const showPathDuringTrace = ref(initial.showPathDuringTrace)

  watch(
    [theme, animationSpeed, panelCollapsed, showCoordinates, showPathDuringTrace],
    () => {
      const value: StoredPreferences = {
        theme: theme.value,
        animationSpeed: animationSpeed.value,
        panelCollapsed: panelCollapsed.value,
        showCoordinates: showCoordinates.value,
        showPathDuringTrace: showPathDuringTrace.value,
      }
      localStorage.setItem(storageKey, JSON.stringify(value))
      document.documentElement.dataset.theme = theme.value
    },
    { immediate: true },
  )

  return {
    theme,
    animationSpeed,
    panelCollapsed,
    showCoordinates,
    showPathDuringTrace,
  }
})
