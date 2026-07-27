import { beforeAll, describe, expect, it } from 'vitest'
import type { MazeImportPipelineResult } from '@/types/mazeImportPipeline'
import { analyzeRasterMaze } from './analyzeRasterMaze'
import { createWorkerSafeResult } from './mazeImportWorkerResult'
import { createPipelineMazeFixture } from './testUtils/generatePipelineImage'

describe('createWorkerSafeResult', () => {
  let pipeline: MazeImportPipelineResult

  beforeAll(async () => {
    pipeline = await analyzeRasterMaze(
      createPipelineMazeFixture({ rows: 5, columns: 5 }),
    )
    expect(pipeline.status).toBe('success')
  })

  it('summary 不包含大型图片、蒙版或积分图', () => {
    const result = createWorkerSafeResult(pipeline, 'summary')
    expect(result.detail).toBe('summary')
    expect('preview' in result).toBe(false)
    expect('fullResult' in result).toBe(false)
    expect('sourceImage' in result).toBe(false)
    expect(result.detection).toMatchObject({
      rows: 5,
      columns: 5,
    })
    expect(result.entranceSelection?.candidates).toHaveLength(2)
  })

  it('preview 默认包含裁剪蒙版和必要结构，但不包含积分图', () => {
    const result = createWorkerSafeResult(pipeline)
    expect(result.detail).toBe('preview')
    if (result.detail !== 'preview') {
      throw new Error('预期 preview 结果。')
    }
    expect(result.preview.croppedMask?.values)
      .toBeInstanceOf(Uint8Array)
    expect(result.preview.horizontalLineCenters).toHaveLength(6)
    expect(result.preview.verticalLineCenters).toHaveLength(6)
    expect(result.preview.entranceCandidates).toHaveLength(2)
    expect('integralMask' in result.preview).toBe(false)
    expect('grayscale' in result.preview).toBe(false)
  })

  it('full 保留完整流水线结果引用，仅用于诊断', () => {
    const result = createWorkerSafeResult(pipeline, 'full')
    expect(result.detail).toBe('full')
    if (result.detail !== 'full') {
      throw new Error('预期 full 结果。')
    }
    expect(result.fullResult).toBe(pipeline)
    expect(result.fullResult.preprocess?.integralMask.values)
      .toBeInstanceOf(Uint32Array)
  })

  it('裁剪不会修改原流水线结果', () => {
    const originalWarnings = pipeline.warnings
    const originalDocument = pipeline.document
    const result = createWorkerSafeResult(pipeline, 'summary')
    result.warnings.push({
      code: 'TEST',
      message: '测试',
      stage: 'completed',
    })
    expect(pipeline.warnings).toBe(originalWarnings)
    expect(pipeline.warnings).toHaveLength(0)
    expect(pipeline.document).toBe(originalDocument)
    expect(result.document).not.toBe(originalDocument)
  })
})
