import { describe, expect, it } from 'vitest'
import { ENTRANCE_WARNING_CODES } from '@/config/entranceDetection'
import type {
  OuterBoundarySide,
  PassageState,
} from '@/types/mazeTopology'
import { extractEntranceCandidates } from './entranceCandidateExtractor'
import {
  makeDetection,
  makeOuterSegment,
  makeTopology,
} from './testUtils/entranceFixtures'

const sideSegments = (
  side: OuterBoundarySide,
  states: PassageState[],
  rows = 5,
  columns = 6,
) => states.map((state, index) =>
  makeOuterSegment(side, index, rows, columns, state))

describe('extractEntranceCandidates', () => {
  it.each([
    ['top', 1, { row: 0, column: 1 }],
    ['right', 2, { row: 2, column: 5 }],
    ['bottom', 3, { row: 4, column: 3 }],
    ['left', 2, { row: 2, column: 0 }],
  ] as const)('提取 %s 单格开口并映射合法内部单元', (
    side,
    index,
    expectedCell,
  ) => {
    const rows = 5
    const columns = 6
    const segment = makeOuterSegment(
      side,
      index,
      rows,
      columns,
      'open',
    )
    const candidates = extractEntranceCandidates(
      makeTopology(rows, columns, [segment]),
      makeDetection(rows, columns),
    )
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      id: `${side}:${index}-${index}`,
      side,
      startIndex: index,
      endIndex: index,
      widthInCells: 1,
      representativeCell: expectedCell,
      interiorCell: expectedCell,
      state: 'reliable',
      componentId: 0,
      componentSize: rows * columns,
    })
    expect(candidates[0]?.confidence).toBeGreaterThanOrEqual(0.55)
    expect(candidates[0]?.confidence).toBeLessThanOrEqual(1)
  })

  it('相邻 open 合并为宽入口，wall 终止分组且中心来自理论格线', () => {
    const segments = sideSegments(
      'top',
      ['wall', 'open', 'open', 'wall', 'open', 'wall'],
    )
    const candidates = extractEntranceCandidates(
      makeTopology(5, 6, segments),
      makeDetection(5, 6, 10),
    )
    expect(candidates.map((candidate) => candidate.id))
      .toEqual(['top:1-2', 'top:4-4'])
    expect(candidates[0]).toMatchObject({
      widthInCells: 2,
      representativeCell: { row: 0, column: 1 },
      centerPixel: { x: 20, y: 0 },
    })
  })

  it('边缘 uncertain 可有限吸收并降低状态和置信度', () => {
    const segments = sideSegments(
      'top',
      ['wall', 'open', 'open', 'uncertain', 'wall', 'wall'],
    )
    const topology = makeTopology(5, 6, segments)
    const [candidate] = extractEntranceCandidates(
      topology,
      makeDetection(5, 6),
    )
    expect(candidate).toMatchObject({
      id: 'top:1-3',
      widthInCells: 3,
      state: 'uncertain',
    })
    expect(candidate?.warnings).toContain(
      ENTRANCE_WARNING_CODES.uncertainExtension,
    )
    expect(candidate?.confidence).toBeLessThan(topology.confidence)
  })

  it('uncertain 不能单独生成入口，也不会桥接 open-uncertain-open', () => {
    const onlyUncertain = sideSegments(
      'top',
      ['wall', 'uncertain', 'wall', 'wall', 'wall', 'wall'],
    )
    expect(extractEntranceCandidates(
      makeTopology(5, 6, onlyUncertain),
      makeDetection(5, 6),
    )).toEqual([])

    const separated = sideSegments(
      'top',
      ['wall', 'open', 'uncertain', 'open', 'wall', 'wall'],
    )
    expect(extractEntranceCandidates(
      makeTopology(5, 6, separated),
      makeDetection(5, 6),
    ).map((candidate) => candidate.id))
      .toEqual(['top:1-1', 'top:3-3'])
  })

  it('maximumUncertainExtension 限制单个候选吸收的总段数', () => {
    const segments = sideSegments(
      'top',
      ['wall', 'uncertain', 'open', 'uncertain', 'wall', 'wall'],
    )
    const [candidate] = extractEntranceCandidates(
      makeTopology(5, 6, segments),
      makeDetection(5, 6),
      { maximumUncertainExtension: 1 },
    )
    expect(candidate).toMatchObject({
      id: 'top:1-2',
      widthInCells: 2,
    })
    expect(candidate?.segments).toHaveLength(2)
  })

  it('超宽入口保留诊断但标记 invalid，不静默截断', () => {
    const segments = sideSegments(
      'top',
      ['open', 'open', 'open', 'open', 'open', 'wall'],
    )
    const [candidate] = extractEntranceCandidates(
      makeTopology(5, 6, segments),
      makeDetection(5, 6),
    )
    expect(candidate).toMatchObject({
      id: 'top:0-4',
      widthInCells: 5,
      state: 'invalid',
    })
    expect(candidate?.segments).toHaveLength(5)
    expect(candidate?.warnings).toContain(
      ENTRANCE_WARNING_CODES.openingTooWide,
    )
  })

  it('孤立单元入口降级且不修改 topology 或边界输入', () => {
    const segment = makeOuterSegment('top', 1, 3, 3, 'open')
    const topology = makeTopology(3, 3, [segment], [])
    const before = structuredClone(topology)
    const [candidate] = extractEntranceCandidates(
      topology,
      makeDetection(3, 3),
    )
    expect(candidate?.state).toBe('uncertain')
    expect(candidate?.componentSize).toBe(1)
    expect(candidate?.warnings).toContain(
      ENTRANCE_WARNING_CODES.isolatedCell,
    )
    expect(topology).toEqual(before)
  })

  it('正交拓扑不可用时不从边界像素重新猜测入口', () => {
    const topology = makeTopology(3, 3, [
      makeOuterSegment('top', 1, 3, 3, 'open'),
    ])
    topology.analyzed = false
    expect(extractEntranceCandidates(
      topology,
      makeDetection(3, 3),
    )).toEqual([])
  })
})
