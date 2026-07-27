import { describe, expect, it } from 'vitest'
import { collectPipelineWarnings } from './pipelineWarnings'

describe('collectPipelineWarnings', () => {
  it('保持阶段顺序、去除完全重复项并保留阶段来源', () => {
    const result = collectPipelineWarnings(
      {
        stage: 'preprocess',
        warnings: ['SAME', 'SAME', 'OTHER'],
      },
      {
        stage: 'orthogonal-detection',
        warnings: ['SAME'],
      },
    )
    expect(result.map(({ stage, code }) => [stage, code])).toEqual([
      ['preprocess', 'SAME'],
      ['preprocess', 'OTHER'],
      ['orthogonal-detection', 'SAME'],
    ])
  })

  it('为已知代码提供中文消息', () => {
    expect(collectPipelineWarnings({
      stage: 'entrance-selection',
      warnings: ['ENTRANCE_PAIR_DISCONNECTED'],
    })[0]).toMatchObject({
      code: 'ENTRANCE_PAIR_DISCONNECTED',
      message: '入口候选不在同一连通区域。',
    })
  })
})
