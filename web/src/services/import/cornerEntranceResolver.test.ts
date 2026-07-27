import { describe, expect, it } from 'vitest'
import { ENTRANCE_WARNING_CODES } from '@/config/entranceDetection'
import type { OuterBoundarySide } from '@/types/mazeTopology'
import { resolveCornerEntranceCandidates } from './cornerEntranceResolver'
import { makeCandidate } from './testUtils/entranceFixtures'

describe('resolveCornerEntranceCandidates', () => {
  it.each([
    ['top-left', 'top', 'left', { row: 0, column: 0 }],
    ['top-right', 'top', 'right', { row: 0, column: 3 }],
    ['bottom-left', 'bottom', 'left', { row: 2, column: 0 }],
    ['bottom-right', 'bottom', 'right', { row: 2, column: 3 }],
  ] as const)('合并 %s 的相邻边重复开口', (
    corner,
    firstSide,
    secondSide,
    cell,
  ) => {
    const candidates = [
      makeCandidate(`${firstSide}:x`, firstSide, cell),
      makeCandidate(`${secondSide}:x`, secondSide, cell),
    ]
    const before = structuredClone(candidates)
    const result = resolveCornerEntranceCandidates(
      candidates,
      3,
      4,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toContain(`corner:${corner}:`)
    expect(result[0]?.segments).toHaveLength(2)
    expect(result[0]?.representativeCell).toEqual(cell)
    expect(result[0]?.warnings).toContain(
      ENTRANCE_WARNING_CODES.cornerDuplicateMerged,
    )
    expect(result[0]?.confidence).toBeLessThanOrEqual(1)
    expect(candidates).toEqual(before)
  })

  it('靠近角落但对应不同 cell 时不合并', () => {
    const candidates = [
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }),
      makeCandidate('left:1-1', 'left', { row: 1, column: 0 }),
    ]
    expect(resolveCornerEntranceCandidates(candidates, 3, 4))
      .toHaveLength(2)
  })

  it('componentId 不一致时不合并', () => {
    const candidates = [
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }),
      makeCandidate('left:0-0', 'left', { row: 0, column: 0 }, {
        componentId: 1,
      }),
    ]
    expect(resolveCornerEntranceCandidates(candidates, 3, 4))
      .toHaveLength(2)
  })

  it('关闭配置时保留两个候选和稳定边顺序', () => {
    const candidates = [
      makeCandidate('left:0-0', 'left', { row: 0, column: 0 }),
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }),
    ]
    const result = resolveCornerEntranceCandidates(
      candidates,
      3,
      4,
      { mergeCornerOpenings: false },
    )
    expect(result.map((candidate) => candidate.side))
      .toEqual<OuterBoundarySide[]>(['top', 'left'])
  })
})
