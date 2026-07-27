import { describe, expect, it } from 'vitest'
import type { BinaryMask } from '@/types/imageAnalysis'
import { calculateOrientationEvidence } from './orientationEvidence'
import { generateOrthogonalMazeMask } from './testUtils/generateOrthogonalMazeMask'

const maskFromPoints = (
  width: number,
  height: number,
  points: Array<[number, number]>,
): BinaryMask => {
  const values = new Uint8Array(width * height)
  for (const [x, y] of points) {
    values[y * width + x] = 1
  }
  return { width, height, values }
}

describe('calculateOrientationEvidence', () => {
  it('分别识别水平和垂直连续证据', () => {
    const horizontal = maskFromPoints(
      9,
      9,
      Array.from({ length: 7 }, (_, index) => [index + 1, 4]),
    )
    const vertical = maskFromPoints(
      9,
      9,
      Array.from({ length: 7 }, (_, index) => [4, index + 1]),
    )

    const horizontalResult = calculateOrientationEvidence(horizontal)
    const verticalResult = calculateOrientationEvidence(vertical)

    expect(horizontalResult.horizontalScore).toBeGreaterThan(0.7)
    expect(horizontalResult.verticalScore).toBe(0)
    expect(verticalResult.verticalScore).toBeGreaterThan(0.7)
    expect(verticalResult.horizontalScore).toBe(0)
  })

  it('正交迷宫证据显著高于斜线和孤立噪点', () => {
    const maze = generateOrthogonalMazeMask({
      rows: 8,
      columns: 10,
      cellWidth: 10,
      openings: true,
    })
    const diagonal = maskFromPoints(
      40,
      40,
      Array.from({ length: 30 }, (_, index) => [index + 5, index + 5]),
    )
    const noise = maskFromPoints(
      40,
      40,
      Array.from({ length: 30 }, (_, index) => [
        (index * 13) % 39,
        (index * 17) % 39,
      ]),
    )

    const mazeScore = calculateOrientationEvidence(maze).orthogonalityScore
    expect(mazeScore).toBeGreaterThan(0.3)
    expect(calculateOrientationEvidence(diagonal).orthogonalityScore)
      .toBeLessThan(mazeScore)
    expect(calculateOrientationEvidence(noise).orthogonalityScore)
      .toBeLessThan(mazeScore)
  })

  it('单点噪声不产生方向能量', () => {
    const result = calculateOrientationEvidence(maskFromPoints(9, 9, [[4, 4]]))
    expect(result.horizontalEnergy).toBe(0)
    expect(result.verticalEnergy).toBe(0)
    expect(result.orthogonalityScore).toBe(0)
  })
})
