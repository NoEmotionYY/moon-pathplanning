import type { PlaybackStatus } from '@/types/trace'

interface PathVisibilityState {
  hasPath: boolean
  traceSupported: boolean
  traceTotalSteps: number
  playbackStatus: PlaybackStatus
  showDuringTrace: boolean
}

export const shouldShowFinalPath = ({
  hasPath,
  traceSupported,
  traceTotalSteps,
  playbackStatus,
  showDuringTrace,
}: PathVisibilityState): boolean =>
  hasPath &&
  (
    !traceSupported ||
    traceTotalSteps === 0 ||
    showDuringTrace ||
    playbackStatus === 'finished'
  )
