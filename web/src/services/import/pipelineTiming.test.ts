import { describe, expect, it } from 'vitest'
import { createPipelineTimer } from './pipelineTiming'

describe('createPipelineTimer', () => {
  it('使用注入时钟稳定记录已执行阶段和总耗时', () => {
    const values = [0, 2, 7, 8, 12, 15]
    const timer = createPipelineTimer(() => values.shift() ?? 15)
    expect(timer.measure('validation', () => 'ok')).toBe('ok')
    timer.measure('transform', () => undefined)
    const result = timer.finish()
    expect(result.timings).toEqual([
      { stage: 'validation', durationMs: 5 },
      { stage: 'transform', durationMs: 4 },
    ])
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(9)
  })

  it('阶段抛错时仍记录该阶段耗时', () => {
    let current = 0
    const timer = createPipelineTimer(() => current++)
    expect(() => timer.measure('preprocess', () => {
      throw new Error('failed')
    })).toThrow('failed')
    expect(timer.finish().timings).toHaveLength(1)
  })
})
