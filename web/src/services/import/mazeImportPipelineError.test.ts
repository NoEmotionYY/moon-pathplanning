import { describe, expect, it } from 'vitest'
import { MazeImageProcessingError } from './imageProcessingError'
import {
  createCancelledPipelineError,
  normalizePipelineError,
} from './mazeImportPipelineError'

describe('normalizePipelineError', () => {
  it('保留领域错误代码和中文消息，不暴露堆栈', () => {
    const result = normalizePipelineError(
      new MazeImageProcessingError('WALL_MASK_EMPTY', '墙体蒙版为空。'),
      'preprocess',
    )
    expect(result).toEqual({
      code: 'WALL_MASK_EMPTY',
      message: '墙体蒙版为空。',
      stage: 'preprocess',
      cause: 'MazeImageProcessingError',
    })
    expect('stack' in result).toBe(false)
  })

  it('标准化普通 Error、未知值与取消', () => {
    expect(normalizePipelineError(new TypeError('无效参数'), 'validation'))
      .toMatchObject({
        code: 'IMPORT_PIPELINE_FAILED',
        message: '无效参数',
        cause: 'TypeError',
      })
    expect(normalizePipelineError({ reason: 'unknown' }, 'transform'))
      .toMatchObject({
        code: 'IMPORT_PIPELINE_FAILED',
        stage: 'transform',
      })
    expect(createCancelledPipelineError('preprocess')).toEqual({
      code: 'IMPORT_CANCELLED',
      message: '迷宫图片分析已取消。',
      stage: 'preprocess',
    })
  })
})
