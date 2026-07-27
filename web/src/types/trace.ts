import type { PointTuple } from './grid'

export type SearchEventKind = 'discovered' | 'expanded' | 'current'
export type TraceMode = 'recorded' | 'none'
export type PlaybackStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished'

export interface SearchEvent {
  step: number
  kind: SearchEventKind
  point: PointTuple
  frontierSize: number
  source: 'forward' | 'backward' | null
}

export interface SearchTrace {
  supported: boolean
  mode: TraceMode
  totalSteps: number
  events: SearchEvent[]
}
