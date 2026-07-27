import { describe, expect, it } from 'vitest'
import { GRID_CONVERSION_CODES } from '@/config/orthogonalGridConversion'
import type {
  EntranceCandidate,
  EntrancePairCandidate,
  EntranceSelectionResult,
  EntranceSelectionStatus,
} from '@/types/mazeEntrances'
import type { MazeAdjacencyEdge } from '@/types/mazeTopology'
import type { OrthogonalMazeToGridInput } from './orthogonalMazeToGridDocument'
import { buildEntrancePairCandidates } from './entrancePairAnalyzer'
import { selectEntrancePair } from './entranceSelection'
import { buildIntegralImage } from './integralImage'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { analyzeOrthogonalTopology } from './orthogonalTopologyAnalyzer'
import {
  convertOrthogonalMazeToGridDocument,
} from './orthogonalMazeToGridDocument'
import {
  horizontalPassageToGridPoint,
  mazeCellToGridPoint,
  verticalPassageToGridPoint,
} from './orthogonalGridCoordinates'
import {
  makeCandidate,
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

const makeSelectedInput = (
  rows: number,
  columns: number,
  edges: MazeAdjacencyEdge[] = makeRowMajorChainEdges(rows, columns),
): OrthogonalMazeToGridInput => {
  const topology = makeTopology(rows, columns, [], edges)
  const first = makeCandidate(
    'top:0-0',
    'top',
    { row: 0, column: 0 },
    { componentSize: rows * columns },
  )
  const second = makeCandidate(
    `bottom:${columns - 1}-${columns - 1}`,
    'bottom',
    { row: rows - 1, column: columns - 1 },
    { componentSize: rows * columns },
  )
  const pair: EntrancePairCandidate = {
    first,
    second,
    connected: true,
    sameComponent: true,
    graphDistance: Math.max(1, rows * columns - 1),
    boundaryDistance: 1,
    confidence: 0.9,
    warnings: [],
  }
  const entranceSelection: EntranceSelectionResult = {
    status: 'selected',
    candidates: [first, second],
    pairCandidates: [pair],
    selectedPair: pair,
    automatic: true,
    confidence: 0.9,
    warnings: [],
  }
  return {
    detection: makeDetection(rows, columns),
    topology,
    entranceSelection,
  }
}

const selectionWithStatus = (
  status: EntranceSelectionStatus,
): EntranceSelectionResult => ({
  status,
  candidates: [],
  pairCandidates: [],
  selectedPair: null,
  automatic: false,
  confidence: 0,
  warnings: [],
})

const passagePoint = (edge: MazeAdjacencyEdge) =>
  edge.from.row === edge.to.row
    ? horizontalPassageToGridPoint(
        edge.from.row,
        Math.min(edge.from.column, edge.to.column),
      )
    : verticalPassageToGridPoint(
        Math.min(edge.from.row, edge.to.row),
        edge.from.column,
      )

const convertGenerated = (
  rows: number,
  columns: number,
  wallThickness: number,
) => {
  const passages = generateSpanningMazePassages(rows, columns)
  const generated = generateMazeMaskFromPassages(
    {
      rows,
      columns,
      cellWidth: 12,
      wallThickness,
      openings: [
        { side: 'top', cellIndex: 0 },
        { side: 'bottom', cellIndex: columns - 1 },
      ],
      seed: 2026,
    },
    passages,
  )
  const integral = buildIntegralImage(generated.mask)
  const detection = detectOrthogonalMaze(generated.mask, integral)
  expect(detection.detected).toBe(true)
  const topology = analyzeOrthogonalTopology(
    generated.mask,
    integral,
    detection,
  )
  const entranceSelection = selectEntrancePair(topology, detection)
  expect(entranceSelection.status).toBe('selected')
  const result = convertOrthogonalMazeToGridDocument({
    detection,
    topology,
    entranceSelection,
  })
  return { generated, detection, topology, entranceSelection, result }
}

describe('convertOrthogonalMazeToGridDocument', () => {
  it('2 x 2 转换为 5 x 5 并保持所有计数不变量', () => {
    const result = convertOrthogonalMazeToGridDocument(
      makeSelectedInput(2, 2),
    )
    expect(result.success).toBe(true)
    expect(result.document).toMatchObject({
      width: 5,
      height: 5,
      start: [1, 0],
      goal: [3, 4],
      movement: 'four_way',
      terrain: [],
    })
    expect(result.metrics).toMatchObject({
      logicalCellCenters: 4,
      openPassageCells: 3,
      openedOuterBoundaryCells: 2,
      expectedWalkableCells: 9,
      walkableCells: 9,
    })
    expect(result.startSource?.id).toBe('top:0-0')
    expect(result.goalSource?.id).toBe('bottom:1-1')
  })

  it.each([
    ['none', GRID_CONVERSION_CODES.entrancePairRequired],
    ['single', GRID_CONVERSION_CODES.entrancePairRequired],
    ['ambiguous', GRID_CONVERSION_CODES.entrancePairAmbiguous],
    ['disconnected', GRID_CONVERSION_CODES.entrancePairDisconnected],
    ['low-confidence', GRID_CONVERSION_CODES.entrancePairLowConfidence],
    ['topology-unavailable', GRID_CONVERSION_CODES.entrancePairRequired],
  ] as const)('%s 状态拒绝自动生成文档', (status, code) => {
    const input = makeSelectedInput(2, 2)
    input.entranceSelection = selectionWithStatus(status)
    const result = convertOrthogonalMazeToGridDocument(input)
    expect(result).toMatchObject({
      success: false,
      document: null,
      error: { code },
    })
  })

  it('检测或拓扑不可用时在转换前拒绝', () => {
    const detectionInput = makeSelectedInput(2, 2)
    detectionInput.detection.detected = false
    expect(convertOrthogonalMazeToGridDocument(detectionInput).error?.code)
      .toBe(GRID_CONVERSION_CODES.orthogonalDetectionRequired)

    const topologyInput = makeSelectedInput(2, 2)
    topologyInput.topology.analyzed = false
    expect(convertOrthogonalMazeToGridDocument(topologyInput).error?.code)
      .toBe(GRID_CONVERSION_CODES.topologyRequired)
  })

  it('未对应邻接边的内部中间格始终保持障碍', () => {
    const edges = [
      makeEdge({ row: 0, column: 0 }, { row: 1, column: 0 }),
      makeEdge({ row: 1, column: 0 }, { row: 1, column: 1 }),
      makeEdge({ row: 1, column: 1 }, { row: 0, column: 1 }),
    ]
    const result = convertOrthogonalMazeToGridDocument(
      makeSelectedInput(2, 2, edges),
    )
    expect(result.success).toBe(true)
    expect(result.document?.obstacles).toContainEqual([2, 1])
  })

  it('宽入口默认开放全部边界格，但 start 仍使用代表格', () => {
    const input = makeSelectedInput(2, 3)
    const first = input.entranceSelection.candidates[0]
    const pair = input.entranceSelection.selectedPair
    if (!first || !pair) {
      throw new Error('测试入口对缺失')
    }
    first.id = 'top:0-1'
    first.endIndex = 1
    first.widthInCells = 2
    first.segments = [
      makeOuterSegment('top', 0, 2, 3, 'open'),
      makeOuterSegment('top', 1, 2, 3, 'open'),
    ]
    const result = convertOrthogonalMazeToGridDocument(input)
    expect(result.success).toBe(true)
    expect(result.document?.start).toEqual([1, 0])
    expect(result.startMapping?.openedBoundaryPoints).toEqual([
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ])
    expect(result.metrics?.openedOuterBoundaryCells).toBe(3)
  })

  it('关闭整片外边界开放时只开放两个代表边界格', () => {
    const input = makeSelectedInput(2, 3)
    const first = input.entranceSelection.candidates[0]
    if (!first) {
      throw new Error('测试入口候选缺失')
    }
    first.id = 'top:0-1'
    first.endIndex = 1
    first.widthInCells = 2
    first.segments = [
      makeOuterSegment('top', 0, 2, 3, 'open'),
      makeOuterSegment('top', 1, 2, 3, 'open'),
    ]
    input.options = { openOuterBoundary: false }
    const result = convertOrthogonalMazeToGridDocument(input)
    expect(result.success).toBe(true)
    expect(result.metrics?.openedOuterBoundaryCells).toBe(2)
    expect(result.document?.obstacles).toContainEqual([3, 0])
  })

  it('76 x 76 转换为 153 x 153 时拒绝，75 x 75 刚好允许', () => {
    const tooLarge = makeSelectedInput(76, 76, [])
    expect(convertOrthogonalMazeToGridDocument(tooLarge).error?.code)
      .toBe(GRID_CONVERSION_CODES.sizeExceeded)

    const input = makeSelectedInput(75, 75)
    const start = performance.now()
    const result = convertOrthogonalMazeToGridDocument(input)
    const elapsed = performance.now() - start
    console.info(
      `[grid conversion benchmark] 75x75 -> 151x151: ` +
      `${elapsed.toFixed(1)} ms`,
    )
    expect(result.success).toBe(true)
    expect(result.document).toMatchObject({ width: 151, height: 151 })
    expect(result.warnings).toContain(GRID_CONVERSION_CODES.largeMap)
    expect(result.metrics?.walkableCells)
      .toBe(result.metrics?.expectedWalkableCells)
  })

  it('显式 manualPair 只解析现有连通候选且保留给定顺序', () => {
    const input = makeSelectedInput(2, 3)
    const third = makeCandidate(
      'top:2-2',
      'top',
      { row: 0, column: 2 },
      { componentSize: 6 },
    )
    const candidates = [
      ...input.entranceSelection.candidates,
      third,
    ]
    input.entranceSelection = {
      status: 'ambiguous',
      candidates,
      pairCandidates: buildEntrancePairCandidates(
        candidates,
        input.topology,
      ),
      selectedPair: null,
      automatic: false,
      confidence: 0.9,
      warnings: [],
    }
    input.manualPair = {
      firstCandidateId: third.id,
      secondCandidateId: candidates[0]?.id ?? '',
    }
    const result = convertOrthogonalMazeToGridDocument(input)
    expect(result.success).toBe(true)
    expect(result.startSource?.id).toBe(third.id)
    expect(result.goalSource?.id).toBe(candidates[0]?.id)
  })

  it.each([
    { rows: 5, columns: 5, wallThickness: 1 },
    { rows: 8, columns: 10, wallThickness: 3 },
    { rows: 20, columns: 20, wallThickness: 5 },
  ])(
    '$rows x $columns、墙宽 $wallThickness 逐格生成精确文档',
    ({ rows, columns, wallThickness }) => {
      const output = convertGenerated(
        rows,
        columns,
        wallThickness,
      )
      const { result, generated, topology } = output
      expect(result.success).toBe(true)
      const walkable = new Set<string>()
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const point = mazeCellToGridPoint({ row, column })
          walkable.add(`${point.x},${point.y}`)
        }
      }
      for (const edge of generated.expectedEdges) {
        const point = passagePoint({
          ...edge,
          confidence: 1,
          evidence: topology.adjacencyEdges[0]?.evidence ??
            makeEdge(
              { row: 0, column: 0 },
              { row: 0, column: 1 },
            ).evidence,
        })
        walkable.add(`${point.x},${point.y}`)
      }
      walkable.add('1,0')
      walkable.add(`${columns * 2 - 1},${rows * 2}`)
      const expectedObstacles: [number, number][] = []
      for (let y = 0; y < rows * 2 + 1; y += 1) {
        for (let x = 0; x < columns * 2 + 1; x += 1) {
          if (!walkable.has(`${x},${y}`)) {
            expectedObstacles.push([x, y])
          }
        }
      }
      expect(result.document?.obstacles).toEqual(expectedObstacles)
      expect(result.metrics?.walkableCells).toBe(walkable.size)
      expect(result.metrics?.walkableCells)
        .toBe(result.metrics?.expectedWalkableCells)
    },
  )

  it('不修改 detection、topology 或 entranceSelection', () => {
    const input = makeSelectedInput(3, 3)
    const before = structuredClone(input)
    expect(convertOrthogonalMazeToGridDocument(input).success).toBe(true)
    expect(input).toEqual(before)
  })
})
