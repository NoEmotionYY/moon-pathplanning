import { describe, expect, it } from 'vitest'
import { ENTRANCE_WARNING_CODES } from '@/config/entranceDetection'
import { buildEntrancePairCandidates } from './entrancePairAnalyzer'
import {
  makeCandidate,
  makeEdge,
  makeTopology,
} from './testUtils/entranceFixtures'

describe('buildEntrancePairCandidates', () => {
  it('两个连通入口生成一个候选对并计算最短图距离', () => {
    const topology = makeTopology(1, 3, [], [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 1 }),
      makeEdge({ row: 0, column: 1 }, { row: 0, column: 2 }),
    ])
    const candidates = [
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }, {
        componentSize: 3,
      }),
      makeCandidate('top:2-2', 'top', { row: 0, column: 2 }, {
        componentSize: 3,
      }),
    ]
    const [pair] = buildEntrancePairCandidates(candidates, topology)
    expect(pair).toMatchObject({
      connected: true,
      sameComponent: true,
      graphDistance: 2,
      boundaryDistance: 20,
    })
    expect(pair?.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('不连通入口返回 null 图距离和诊断', () => {
    const topology = makeTopology(1, 3, [], [
      makeEdge({ row: 0, column: 0 }, { row: 0, column: 1 }),
    ])
    const candidates = [
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }),
      makeCandidate('top:2-2', 'top', { row: 0, column: 2 }, {
        componentId: 1,
        componentSize: 1,
      }),
    ]
    const [pair] = buildEntrancePairCandidates(candidates, topology)
    expect(pair).toMatchObject({
      connected: false,
      sameComponent: false,
      graphDistance: null,
    })
    expect(pair?.warnings).toContain(
      ENTRANCE_WARNING_CODES.pairDisconnected,
    )
  })

  it('三个入口恰好生成三个无重复组合且顺序稳定', () => {
    const topology = makeTopology(1, 3)
    const candidates = [
      makeCandidate('top:2-2', 'top', { row: 0, column: 2 }),
      makeCandidate('top:0-0', 'top', { row: 0, column: 0 }),
      makeCandidate('top:1-1', 'top', { row: 0, column: 1 }),
    ]
    const first = buildEntrancePairCandidates(candidates, topology)
    const second = buildEntrancePairCandidates(
      [...candidates].reverse(),
      topology,
    )
    const keys = first.map((pair) => `${pair.first.id}|${pair.second.id}`)
    expect(keys).toHaveLength(3)
    expect(new Set(keys).size).toBe(3)
    expect(second.map((pair) => `${pair.first.id}|${pair.second.id}`))
      .toEqual(keys)
  })

  it('候选不会与自己配对且不修改输入', () => {
    const candidate = makeCandidate(
      'top:0-0',
      'top',
      { row: 0, column: 0 },
    )
    const candidates = [candidate]
    const before = structuredClone(candidates)
    expect(buildEntrancePairCandidates(
      candidates,
      makeTopology(2, 2),
    )).toEqual([])
    expect(candidates).toEqual(before)
  })
})
