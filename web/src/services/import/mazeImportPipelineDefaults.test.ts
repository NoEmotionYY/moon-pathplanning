import { describe, expect, it } from 'vitest'
import { resolveMazeImportPipelineOptions } from './mazeImportPipelineDefaults'

describe('resolveMazeImportPipelineOptions', () => {
  it('无参数返回完整且相互独立的默认配置', () => {
    const first = resolveMazeImportPipelineOptions()
    const second = resolveMazeImportPipelineOptions()
    expect(first).toMatchObject({
      transform: {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        invert: false,
      },
    })
    expect(first.preprocess).not.toBe(second.preprocess)
    expect(first.orthogonalDetection).not.toBe(second.orthogonalDetection)
    expect(first.entranceDetection).not.toBe(second.entranceDetection)
  })

  it('分别深层覆盖变换、阈值和入口配置而不丢失默认值', () => {
    const input = {
      transform: { rotation: 90 as const },
      preprocess: { wallThreshold: 0.35 },
      entranceDetection: { minimumCandidateConfidence: 0.7 },
    }
    const snapshot = {
      transform: { ...input.transform },
      preprocess: { ...input.preprocess },
      entranceDetection: { ...input.entranceDetection },
    }
    const result = resolveMazeImportPipelineOptions(input)
    expect(result.transform).toEqual({
      rotation: 90,
      flipHorizontal: false,
      flipVertical: false,
      invert: false,
    })
    expect(result.preprocess.wallThreshold).toBe(0.35)
    expect(result.preprocess.cropMargin).toBeTypeOf('number')
    expect(result.entranceDetection.minimumCandidateConfidence).toBe(0.7)
    expect(result.entranceDetection.maximumAutomaticCandidates).toBe(2)
    expect(input).toEqual(snapshot)
  })
})
