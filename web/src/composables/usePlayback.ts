import { computed, getCurrentInstance, onBeforeUnmount } from 'vue'
import { usePlannerStore } from '@/stores/planner'
import { playbackFrameController } from '@/services/playbackFrameController'

const BASE_EVENTS_PER_SECOND = 18
const MAX_EVENTS_PER_FRAME = 120
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const

export const usePlayback = () => {
  const planner = usePlannerStore()
  let animationFrame: number | null = null
  let lastTimestamp = 0
  let accumulatedMs = 0

  const canPlayback = computed(
    () => planner.traceSupported && planner.traceEvents.length > 0,
  )
  const isPlaying = computed(() => planner.playbackStatus === 'playing')
  const isPaused = computed(() => planner.playbackStatus === 'paused')
  const progress = computed(() => {
    if (!planner.traceTotalSteps) return 0
    return Math.max(0, (planner.currentEventIndex + 1) / planner.traceTotalSteps)
  })

  const stopFrame = (): boolean => {
    const hadFrame = animationFrame !== null
    if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    animationFrame = null
    lastTimestamp = 0
    accumulatedMs = 0
    return hadFrame
  }

  const tick = (timestamp: number) => {
    if (planner.playbackStatus !== 'playing') {
      stopFrame()
      return
    }
    if (lastTimestamp === 0) lastTimestamp = timestamp
    accumulatedMs += timestamp - lastTimestamp
    lastTimestamp = timestamp

    const interval = 1000 / (BASE_EVENTS_PER_SECOND * planner.playbackSpeed)
    const available = Math.floor(accumulatedMs / interval)
    if (available > 0) {
      const count = Math.min(available, MAX_EVENTS_PER_FRAME)
      accumulatedMs -= count * interval
      planner.applyTraceIndex(planner.currentEventIndex + count)
    }
    if (planner.currentEventIndex >= planner.traceEvents.length - 1) {
      stopFrame()
      return
    }
    animationFrame = requestAnimationFrame(tick)
  }

  const play = () => {
    if (!canPlayback.value) return
    stopFrame()
    if (planner.playbackStatus === 'finished') planner.applyTraceIndex(-1)
    planner.playbackStatus = 'playing'
    animationFrame = requestAnimationFrame(tick)
  }

  const pause = () => {
    if (planner.playbackStatus !== 'playing') return
    planner.playbackStatus = 'paused'
    stopFrame()
  }

  const resume = () => {
    if (planner.playbackStatus !== 'paused') return
    play()
  }

  const reset = () => {
    stopFrame()
    planner.applyTraceIndex(-1)
    planner.playbackStatus = canPlayback.value ? 'ready' : 'idle'
  }

  const seek = (index: number) => {
    const wasPlaying = isPlaying.value
    stopFrame()
    planner.applyTraceIndex(index)
    if (planner.playbackStatus !== 'finished') {
      planner.playbackStatus = wasPlaying ? 'playing' : 'paused'
    }
    if (wasPlaying && planner.playbackStatus === 'playing') {
      animationFrame = requestAnimationFrame(tick)
    }
  }

  const stepForward = () => {
    pause()
    planner.applyTraceIndex(planner.currentEventIndex + 1)
    if (planner.playbackStatus !== 'finished') planner.playbackStatus = 'paused'
  }

  const stepBackward = () => {
    pause()
    planner.applyTraceIndex(planner.currentEventIndex - 1)
    planner.playbackStatus = 'paused'
  }

  const setSpeed = (speed: number) => {
    if (!PLAYBACK_SPEEDS.includes(speed as (typeof PLAYBACK_SPEEDS)[number])) return
    planner.playbackSpeed = speed
  }

  const unregisterFrameStopper = playbackFrameController.register(stopFrame)
  const dispose = () => {
    stopFrame()
    unregisterFrameStopper()
  }

  if (getCurrentInstance()) onBeforeUnmount(dispose)

  return {
    currentEventIndex: computed(() => planner.currentEventIndex),
    isPlaying,
    isPaused,
    playbackSpeed: computed(() => planner.playbackSpeed),
    progress,
    canPlayback,
    play,
    pause,
    resume,
    reset,
    stepForward,
    stepBackward,
    seek,
    setSpeed,
    dispose,
  }
}
