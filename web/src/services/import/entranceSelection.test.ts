import { describe, expect, it } from 'vitest'
import type { OuterOpeningDefinition } from './testUtils/generateOrthogonalMazeMask'
import { buildIntegralImage } from './integralImage'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { analyzeOrthogonalTopology } from './orthogonalTopologyAnalyzer'
import { extractEntranceCandidates } from './entranceCandidateExtractor'
import { buildEntrancePairCandidates } from './entrancePairAnalyzer'
import { selectEntrancePair } from './entranceSelection'
import {
  makeDetection,
  makeEdge,
  makeOuterSegment,
  makeRowMajorChainEdges,
  makeTopology,
} from './testUtils/entranceFixtures'
import {
  generateMazeMaskFromPassages,
  generateSpanningMazePassages,
} from './testUtils/generateOrthogonalMazeMask'

const syntheticSelection = (
  openings: OuterOpeningDefinition[],
  options: {
    rows?: number
    columns?: number
    confidence?: number
    edges?: ReturnType<typeof makeRowMajorChainEdges>
  } = {},
) => {
  const rows = options.rows ?? 3
  const columns = options.columns ?? 4
  const segments = openings.map((opening) =>
    makeOuterSegment(
      opening.side,
      opening.cellIndex,
      rows,
      columns,
      'open',
    ))
  const topology = makeTopology(
    rows,
    columns,
    segments,
    options.edges ?? makeRowMajorChainEdges(rows, columns),
    options.confidence ?? 0.9,
  )
  return selectEntrancePair(topology, makeDetection(rows, columns))
}

const analyzeGeneratedSelection = (
  rows: number,
  columns: number,
  wallThickness: number,
  openings: OuterOpeningDefinition[],
  noiseRatio = 0,
) => {
  const generated = generateMazeMaskFromPassages(
    {
      rows,
      columns,
      cellWidth: 12,
      wallThickness,
      openings,
      seed: 2026,
      noiseRatio,
    },
    generateSpanningMazePassages(rows, columns),
  )
  const integral = buildIntegralImage(generated.mask)
  const detection = detectOrthogonalMaze(generated.mask, integral)
  expect(detection.detected).toBe(true)
  const topology = analyzeOrthogonalTopology(
    generated.mask,
    integral,
    detection,
  )
  expect(topology.analyzed).toBe(true)
  return selectEntrancePair(topology, detection)
}

describe('selectEntrancePair', () => {
  it('无入口返回 none，不伪造默认候选或候选对', () => {
    const result = syntheticSelection([])
    expect(result).toMatchObject({
      status: 'none',
      candidates: [],
      pairCandidates: [],
      selectedPair: null,
      automatic: false,
    })
  })

  it('单入口返回 single，不补造第二个入口', () => {
    const result = syntheticSelection([
      { side: 'top', cellIndex: 1 },
    ])
    expect(result).toMatchObject({
      status: 'single',
      selectedPair: null,
      automatic: false,
    })
    expect(result.candidates).toHaveLength(1)
  })

  it('恰好两个可靠且连通入口自动选择 first/second', () => {
    const result = syntheticSelection([
      { side: 'top', cellIndex: 1 },
      { side: 'bottom', cellIndex: 2 },
    ])
    expect(result).toMatchObject({
      status: 'selected',
      automatic: true,
    })
    expect(result.candidates).toHaveLength(2)
    expect(result.selectedPair).not.toBeNull()
    expect(result.selectedPair?.connected).toBe(true)
    expect('start' in result).toBe(false)
    expect('goal' in result).toBe(false)
  })

  it('两个不连通入口返回 disconnected', () => {
    const result = syntheticSelection(
      [
        { side: 'top', cellIndex: 0 },
        { side: 'top', cellIndex: 2 },
      ],
      {
        rows: 1,
        columns: 3,
        edges: [
          makeEdge(
            { row: 0, column: 0 },
            { row: 0, column: 1 },
          ),
        ],
      },
    )
    expect(result).toMatchObject({
      status: 'disconnected',
      selectedPair: null,
      automatic: false,
    })
  })

  it('两个低置信度入口返回 low-confidence', () => {
    const result = syntheticSelection(
      [
        { side: 'top', cellIndex: 1 },
        { side: 'bottom', cellIndex: 2 },
      ],
      { confidence: 0.5 },
    )
    expect(result).toMatchObject({
      status: 'low-confidence',
      selectedPair: null,
      automatic: false,
    })
  })

  it.each([3, 4])('%s 个入口返回 ambiguous 且不自动选最高分对', (
    count,
  ) => {
    const openings: OuterOpeningDefinition[] = [
      { side: 'top', cellIndex: 1 },
      { side: 'top', cellIndex: 3 },
      { side: 'bottom', cellIndex: 1 },
      { side: 'bottom', cellIndex: 3 },
    ].slice(0, count) as OuterOpeningDefinition[]
    const result = syntheticSelection(openings, { columns: 5 })
    expect(result).toMatchObject({
      status: 'ambiguous',
      selectedPair: null,
      automatic: false,
    })
    expect(result.candidates).toHaveLength(count)
  })

  it('topology.analyzed=false 返回 topology-unavailable', () => {
    const topology = makeTopology(3, 4, [
      makeOuterSegment('top', 1, 3, 4, 'open'),
    ])
    topology.analyzed = false
    expect(selectEntrancePair(topology, makeDetection(3, 4)))
      .toMatchObject({
        status: 'topology-unavailable',
        selectedPair: null,
        automatic: false,
      })
  })

  it.each([
    { rows: 5, columns: 5, wallThickness: 1 },
    { rows: 8, columns: 10, wallThickness: 3 },
    { rows: 20, columns: 20, wallThickness: 5 },
  ])(
    '$rows x $columns、墙宽 $wallThickness 精确识别双开口',
    ({ rows, columns, wallThickness }) => {
      const result = analyzeGeneratedSelection(
        rows,
        columns,
        wallThickness,
        [
          { side: 'top', cellIndex: 0 },
          { side: 'bottom', cellIndex: columns - 1 },
        ],
      )
      expect(result.status).toBe('selected')
      expect(result.candidates).toHaveLength(2)
      expect(result.candidates.every((candidate) =>
        candidate.representativeCell.row >= 0 &&
        candidate.representativeCell.row < rows &&
        candidate.representativeCell.column >= 0 &&
        candidate.representativeCell.column < columns))
        .toBe(true)
    },
  )

  it('宽入口不被拆分，少量固定噪声不产生额外入口', () => {
    const result = analyzeGeneratedSelection(
      8,
      10,
      3,
      [
        { side: 'top', cellIndex: 2, widthInCells: 2 },
        { side: 'bottom', cellIndex: 7 },
      ],
      0.00001,
    )
    expect(result.status).toBe('selected')
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates.find((candidate) => candidate.side === 'top'))
      .toMatchObject({ startIndex: 2, endIndex: 3, widthInCells: 2 })
  })

  it('75 x 75 在 2 个和 10 个入口下记录提取与配对耗时', () => {
    const rows = 75
    const columns = 75
    const openingsFor = (count: number) =>
      Array.from({ length: count }, (_, index) => {
        const top = index < Math.ceil(count / 2)
        return makeOuterSegment(
          top ? 'top' : 'bottom',
          (index % 5) * 12 + 5,
          rows,
          columns,
          'open',
        )
      })
    for (const count of [2, 10]) {
      const topology = makeTopology(
        rows,
        columns,
        openingsFor(count),
        makeRowMajorChainEdges(rows, columns),
      )
      const detection = makeDetection(rows, columns)
      const extractStart = performance.now()
      const candidates = extractEntranceCandidates(topology, detection)
      const extractElapsed = performance.now() - extractStart
      const pairStart = performance.now()
      const pairs = buildEntrancePairCandidates(candidates, topology)
      const pairElapsed = performance.now() - pairStart
      console.info(
        `[entrance benchmark] 75x75, ${count} candidates: ` +
        `extract ${extractElapsed.toFixed(1)} ms, ` +
        `pairs ${pairElapsed.toFixed(1)} ms`,
      )
      expect(candidates).toHaveLength(count)
      expect(pairs).toHaveLength(count * (count - 1) / 2)
      expect(extractElapsed).toBeLessThan(3000)
      expect(pairElapsed).toBeLessThan(3000)
    }
  })
})
