import type {
  MazeImportPipelineStage,
  MazeImportStageTiming,
} from '@/types/mazeImportPipeline'

export type PipelineClock = () => number

export const defaultPipelineClock: PipelineClock = (): number =>
  typeof performance !== 'undefined' &&
  typeof performance.now === 'function'
    ? performance.now()
    : Date.now()

export interface PipelineTimer {
  measure<T>(stage: MazeImportPipelineStage, operation: () => T): T
  finish(): {
    timings: MazeImportStageTiming[]
    totalDurationMs: number
  }
}

export function createPipelineTimer(
  clock: PipelineClock = defaultPipelineClock,
): PipelineTimer {
  const startedAt = clock()
  const timings: MazeImportStageTiming[] = []
  return {
    measure<T>(stage: MazeImportPipelineStage, operation: () => T): T {
      const stageStartedAt = clock()
      try {
        return operation()
      } finally {
        timings.push({
          stage,
          durationMs: Math.max(0, clock() - stageStartedAt),
        })
      }
    },
    finish() {
      const elapsed = Math.max(0, clock() - startedAt)
      const measured = timings.reduce(
        (total, timing) => total + timing.durationMs,
        0,
      )
      return {
        timings: timings.map((timing) => ({ ...timing })),
        totalDurationMs: Math.max(elapsed, measured),
      }
    },
  }
}
