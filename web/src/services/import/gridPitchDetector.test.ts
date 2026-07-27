import { describe, expect, it } from 'vitest'
import { ORTHOGONAL_DETECTION_DEFAULTS } from '@/config/orthogonalDetection'
import type { ProjectionProfile, WallBand } from '@/types/orthogonalMaze'
import {
  detectGridPitchCandidates,
  selectGridPitch,
} from './gridPitchDetector'
import { reconstructGridLines } from './gridLineReconstructor'

const periodicInput = (
  pitch: number,
  cells: number,
  missing: number[] = [],
): { profile: ProjectionProfile; bands: WallBand[] } => {
  const length = pitch * cells + 3
  const values = new Float64Array(length)
  const bands: WallBand[] = []
  for (let line = 0; line <= cells; line += 1) {
    if (missing.includes(line)) {
      continue
    }
    const center = 1 + line * pitch
    values[center] = 1
    bands.push({
      start: center,
      end: center + 1,
      center,
      thickness: 1,
      strength: 1,
      confidence: 1,
    })
  }
  return {
    profile: {
      axis: 'horizontal',
      length,
      values,
      smoothedValues: values.slice(),
      maximum: 1,
      mean: bands.length / length,
    },
    bands,
  }
}

describe('gridPitchDetector', () => {
  it.each([8, 12, 20])('选择 %i 像素周期而非半周期或双周期', (pitch) => {
    const input = periodicInput(pitch, 8)
    const candidates = detectGridPitchCandidates(
      input.profile,
      input.bands,
      { ...ORTHOGONAL_DETECTION_DEFAULTS },
    )
    expect(candidates[0]?.pitch).toBe(pitch)
    expect(candidates[0]?.score).toBeGreaterThan(
      candidates.find((candidate) => candidate.pitch === pitch * 2)?.score ?? 0,
    )
    expect(selectGridPitch(candidates)?.pitch).toBe(pitch)
  })

  it('容忍缺失网格线和弱噪声，并按得分排序', () => {
    const input = periodicInput(12, 10, [4])
    input.profile.smoothedValues[7] = 0.12
    input.bands.push({
      start: 7,
      end: 8,
      center: 7,
      thickness: 1,
      strength: 0.12,
      confidence: 0.05,
    })
    const candidates = detectGridPitchCandidates(
      input.profile,
      input.bands,
      { ...ORTHOGONAL_DETECTION_DEFAULTS },
    )
    expect(candidates[0]?.pitch).toBe(12)
    expect(candidates.every((candidate, index) =>
      index === 0 || (candidates[index - 1]?.score ?? 0) >= candidate.score,
    )).toBe(true)
  })

  it('超出合法 pitch 范围时拒绝', () => {
    const input = periodicInput(20, 6)
    const candidates = detectGridPitchCandidates(
      input.profile,
      input.bands,
      {
        ...ORTHOGONAL_DETECTION_DEFAULTS,
        maximumCellSize: 12,
      },
    )
    expect(selectGridPitch(candidates)?.pitch).not.toBe(20)
  })

  it('无周期峰值时不返回可用周期', () => {
    const input = periodicInput(11, 7)
    input.bands.splice(0)
    input.profile.smoothedValues.fill(0)
    input.profile.maximum = 0
    expect(selectGridPitch(detectGridPitchCandidates(
      input.profile,
      input.bands,
      { ...ORTHOGONAL_DETECTION_DEFAULTS },
    ))).toBeUndefined()
  })

  it('重建 cellCount + 1 条严格递增边界线并补齐缺线', () => {
    const input = periodicInput(12, 8, [3])
    const candidate = selectGridPitch(detectGridPitchCandidates(
      input.profile,
      input.bands,
      { ...ORTHOGONAL_DETECTION_DEFAULTS },
    ))
    expect(candidate).toBeDefined()
    const result = reconstructGridLines(
      input.profile.length,
      candidate!,
      input.profile,
      input.bands,
      { ...ORTHOGONAL_DETECTION_DEFAULTS },
    )

    expect(result.lineCenters).toHaveLength(9)
    expect(result.lineCenters[0]).toBeGreaterThanOrEqual(0)
    expect(result.lineCenters.at(-1)).toBeLessThan(input.profile.length)
    expect(result.lineCenters.every((center, index) =>
      index === 0 || center > (result.lineCenters[index - 1] ?? center),
    )).toBe(true)
  })
})
