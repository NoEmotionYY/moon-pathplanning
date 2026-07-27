import { describe, expect, it } from 'vitest'
import type { BinaryMask } from '@/types/imageAnalysis'
import { buildIntegralImage } from './integralImage'
import {
  sampleHorizontalWallSegment,
  sampleVerticalWallSegment,
} from './wallSegmentSampler'

const createMask = (width = 21, height = 21): BinaryMask => ({
  width,
  height,
  values: new Uint8Array(width * height),
})

const fill = (
  mask: BinaryMask,
  x: number,
  y: number,
  width: number,
  height: number,
  value: 0 | 1 = 1,
): void => {
  for (let row = y; row < y + height; row += 1) {
    mask.values.fill(
      value,
      row * mask.width + x,
      row * mask.width + x + width,
    )
  }
}

describe('wallSegmentSampler', () => {
  it.each([1, 3, 5])('完整 %i 像素垂直墙识别为 wall', (thickness) => {
    const mask = createMask()
    const start = 10 - Math.floor(thickness / 2)
    fill(mask, start, 0, thickness, mask.height)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      10,
      0,
      mask.height,
      thickness,
      thickness,
    )

    expect(evidence.state).toBe('wall')
    expect(evidence.continuityRatio).toBe(1)
    expect(evidence.longestWallRun).toBe(
      evidence.spanEnd - evidence.spanStart,
    )
    expect(evidence.longestGapRun).toBe(0)
    expect(evidence.confidence).toBeGreaterThan(0.9)
  })

  it('完整水平墙识别为 wall 并正确计算密度', () => {
    const mask = createMask()
    fill(mask, 0, 9, mask.width, 3)
    const evidence = sampleHorizontalWallSegment(
      mask,
      buildIntegralImage(mask),
      10,
      0,
      mask.width,
      3,
      3,
    )

    expect(evidence.state).toBe('wall')
    expect(evidence.wallPixelRatio).toBeCloseTo(3 / 5)
    expect(evidence.continuityRatio).toBe(1)
  })

  it.each(['vertical', 'horizontal'] as const)(
    '完全开放 %s 边界识别为 open',
    (orientation) => {
      const mask = createMask()
      const integral = buildIntegralImage(mask)
      const evidence = orientation === 'vertical'
        ? sampleVerticalWallSegment(mask, integral, 10, 0, 21, 1, 1)
        : sampleHorizontalWallSegment(mask, integral, 10, 0, 21, 1, 1)

      expect(evidence.state).toBe('open')
      expect(evidence.wallPixelRatio).toBe(0)
      expect(evidence.continuityRatio).toBe(0)
      expect(evidence.longestWallRun).toBe(0)
      expect(evidence.longestGapRun).toBe(
        evidence.spanEnd - evidence.spanStart,
      )
      expect(evidence.confidence).toBe(1)
    },
  )

  it('仅有两端交叉点时仍识别为 open', () => {
    const mask = createMask()
    fill(mask, 0, 0, mask.width, 1)
    fill(mask, 0, mask.height - 1, mask.width, 1)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      10,
      0,
      mask.height,
      1,
      1,
    )
    expect(evidence.state).toBe('open')
    expect(evidence.continuityRatio).toBe(0)
  })

  it.each([1, 2])('理论中心偏移 %i 像素仍识别完整墙', (offset) => {
    const mask = createMask()
    fill(mask, 10, 0, 1, mask.height)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      10 + offset,
      0,
      mask.height,
      1,
      1,
      { linePositionTolerance: offset },
    )
    expect(evidence.state).toBe('wall')
    expect(evidence.continuityRatio).toBe(1)
  })

  it('局部断裂墙返回 uncertain 且置信度较低', () => {
    const mask = createMask()
    fill(mask, 10, 0, 1, mask.height)
    fill(mask, 10, 7, 1, 7, 0)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      10,
      0,
      mask.height,
      1,
      1,
    )
    expect(evidence.state).toBe('uncertain')
    expect(evidence.longestWallRun).toBeGreaterThan(0)
    expect(evidence.longestGapRun).toBeGreaterThan(0)
    expect(evidence.confidence).toBeLessThanOrEqual(0.25)
    expect(evidence.warnings).toContain('WALL_SEGMENT_UNCERTAIN')
  })

  it('墙段过短返回 uncertain', () => {
    const mask = createMask(5, 5)
    fill(mask, 2, 0, 1, 5)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      2,
      0,
      4,
      1,
      1,
    )
    expect(evidence.state).toBe('uncertain')
    expect(evidence.confidence).toBe(0)
    expect(evidence.warnings).toContain('WALL_SEGMENT_TOO_SHORT')
  })

  it('边缘采样带裁剪到图片范围并记录警告', () => {
    const mask = createMask()
    fill(mask, 0, 0, 1, mask.height)
    const evidence = sampleVerticalWallSegment(
      mask,
      buildIntegralImage(mask),
      -1,
      0,
      mask.height,
      1,
      1,
    )
    expect(evidence.sampleBounds.x).toBe(0)
    expect(evidence.sampleBounds.width).toBeGreaterThan(0)
    expect(evidence.sampleBounds.x + evidence.sampleBounds.width)
      .toBeLessThanOrEqual(mask.width)
    expect(evidence.warnings).toContain(
      'WALL_SEGMENT_SAMPLE_OUT_OF_BOUNDS',
    )
  })
})
