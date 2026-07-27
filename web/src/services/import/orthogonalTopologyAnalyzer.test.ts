import { describe, expect, it } from 'vitest'
import type {
  MazeCell,
  MazePassageDefinition,
} from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import { buildIntegralImage } from './integralImage'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'
import { analyzeOrthogonalTopology } from './orthogonalTopologyAnalyzer'
import {
  generateMazeMaskFromPassages,
} from './testUtils/generateOrthogonalMazeMask'

const cellIndex = (cell: MazeCell, columns: number): number =>
  cell.row * columns + cell.column

const edgeKey = (
  from: MazeCell,
  to: MazeCell,
  columns: number,
): string => {
  const fromIndex = cellIndex(from, columns)
  const toIndex = cellIndex(to, columns)
  return `${Math.min(fromIndex, toIndex)}-${Math.max(fromIndex, toIndex)}`
}

const spanningPassages = (
  rows: number,
  columns: number,
): MazePassageDefinition[] => {
  const candidates: MazePassageDefinition[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (column + 1 < columns) {
        candidates.push({
          from: { row, column },
          to: { row, column: column + 1 },
        })
      }
      if (row + 1 < rows) {
        candidates.push({
          from: { row, column },
          to: { row: row + 1, column },
        })
      }
    }
  }
  let randomState = 2026
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    randomState =
      (Math.imul(randomState, 1664525) + 1013904223) >>> 0
    const target = randomState % (index + 1)
    const current = candidates[index]
    const replacement = candidates[target]
    if (current && replacement) {
      candidates[index] = replacement
      candidates[target] = current
    }
  }
  const parents = Int32Array.from(
    { length: rows * columns },
    (_, index) => index,
  )
  const find = (value: number): number => {
    let root = value
    while ((parents[root] ?? root) !== root) {
      root = parents[root] ?? root
    }
    let current = value
    while ((parents[current] ?? current) !== root) {
      const next = parents[current] ?? root
      parents[current] = root
      current = next
    }
    return root
  }
  const passages: MazePassageDefinition[] = []
  for (const candidate of candidates) {
    const from = find(cellIndex(candidate.from, columns))
    const to = find(cellIndex(candidate.to, columns))
    if (from !== to) {
      parents[to] = from
      passages.push(candidate)
    }
  }
  return passages
}

const analyzeKnownMaze = (
  rows: number,
  columns: number,
  wallThickness: number,
  noiseRatio = 0,
) => {
  const passages = spanningPassages(rows, columns)
  const generated = generateMazeMaskFromPassages(
    {
      rows,
      columns,
      cellWidth: rows >= 75 ? 26 : 12,
      wallThickness,
      seed: 2026,
      noiseRatio,
      openings: [
        { side: 'top', cellIndex: 0 },
        { side: 'bottom', cellIndex: columns - 1 },
      ],
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
  return { ...generated, integral, detection, topology }
}

describe('analyzeOrthogonalTopology', () => {
  it.each([
    { rows: 5, columns: 5, wallThickness: 1 },
    { rows: 8, columns: 10, wallThickness: 3 },
    { rows: 20, columns: 20, wallThickness: 5 },
  ])(
    '$rows x $columns、墙宽 $wallThickness 完整还原已知邻接',
    ({ rows, columns, wallThickness }) => {
      const result = analyzeKnownMaze(rows, columns, wallThickness)
      const expected = result.expectedEdges.map((edge) =>
        edgeKey(edge.from, edge.to, columns),
      )
      const actual = result.topology.adjacencyEdges.map((edge) =>
        edgeKey(edge.from, edge.to, columns),
      )

      expect(result.topology.analyzed).toBe(true)
      expect(actual).toEqual(expected)
      expect(result.topology.horizontalInternalBoundaries)
        .toHaveLength((rows - 1) * columns)
      expect(result.topology.verticalInternalBoundaries)
        .toHaveLength(rows * (columns - 1))
      expect(result.topology.outerBoundaries)
        .toHaveLength(2 * rows + 2 * columns)
      expect(result.topology.metrics.connectedComponents).toBe(1)
      expect(result.topology.confidence).toBeGreaterThanOrEqual(0.5)
      expect(result.topology.warnings).not.toContain(
        'TOPOLOGY_DISCONNECTED',
      )
    },
  )

  it('少量固定噪声仍还原正确邻接', () => {
    const result = analyzeKnownMaze(8, 10, 3, 0.0001)
    expect(result.topology.adjacencyEdges).toHaveLength(
      result.expectedEdges.length,
    )
    expect(result.topology.metrics.connectedComponents).toBe(1)
  })

  it('理论格线整体偏移 1 像素仍还原邻接', () => {
    const result = analyzeKnownMaze(5, 5, 1)
    const shifted: OrthogonalMazeDetection = {
      ...result.detection,
      horizontal: {
        ...result.detection.horizontal,
        lineCenters: result.detection.horizontal.lineCenters.map(
          (center) => center + 1,
        ),
      },
      vertical: {
        ...result.detection.vertical,
        lineCenters: result.detection.vertical.lineCenters.map(
          (center) => center + 1,
        ),
      },
    }
    const topology = analyzeOrthogonalTopology(
      result.mask,
      result.integral,
      shifted,
    )
    expect(topology.adjacencyEdges).toHaveLength(
      result.expectedEdges.length,
    )
  })

  it('局部破损墙段返回 uncertain 而不是错误开放', () => {
    const generated = generateMazeMaskFromPassages(
      { rows: 2, columns: 2, cellWidth: 12, wallThickness: 1 },
      [],
    )
    const x = 12
    for (let y = 3; y < 8; y += 1) {
      generated.mask.values[y * generated.mask.width + x] = 0
    }
    const integral = buildIntegralImage(generated.mask)
    const detection = detectOrthogonalMaze(generated.mask, integral)
    expect(detection.detected).toBe(true)
    const topology = analyzeOrthogonalTopology(
      generated.mask,
      integral,
      detection,
    )
    const damaged = topology.verticalInternalBoundaries.find(
      (boundary) =>
        boundary.from.row === 0 &&
        boundary.from.column === 0,
    )
    expect(damaged?.evidence.state).toBe('uncertain')
    expect(topology.adjacencyEdges).toHaveLength(0)
    expect(topology.warnings).toContain('TOPOLOGY_UNCERTAIN_RATIO_HIGH')
  })

  it('真实不连通和孤立单元只产生诊断，不自动补通道', () => {
    const generated = generateMazeMaskFromPassages(
      { rows: 2, columns: 2, cellWidth: 12, wallThickness: 3 },
      [],
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
    expect(topology.adjacencyEdges).toHaveLength(0)
    expect(topology.metrics.connectedComponents).toBe(4)
    expect(topology.metrics.isolatedCells).toHaveLength(4)
    expect(topology.warnings).toContain('TOPOLOGY_DISCONNECTED')
    expect(topology.warnings).toContain('TOPOLOGY_ISOLATED_CELLS')
    expect(topology.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it('正交检测失败时不生成拓扑', () => {
    const result = analyzeKnownMaze(5, 5, 1)
    const failed: OrthogonalMazeDetection = {
      ...result.detection,
      detected: false,
    }
    const topology = analyzeOrthogonalTopology(
      result.mask,
      result.integral,
      failed,
    )
    expect(topology.analyzed).toBe(false)
    expect(topology.horizontalInternalBoundaries).toHaveLength(0)
    expect(topology.verticalInternalBoundaries).toHaveLength(0)
    expect(topology.outerBoundaries).toHaveLength(0)
    expect(topology.adjacencyEdges).toHaveLength(0)
    expect(topology.warnings).toContain('ORTHOGONAL_DETECTION_REQUIRED')
  })

  it('不修改输入且不生成起点、终点或地图文档', () => {
    const result = analyzeKnownMaze(5, 5, 1)
    const maskCopy = result.mask.values.slice()
    const lineCopy = [...result.detection.horizontal.lineCenters]
    const topology = analyzeOrthogonalTopology(
      result.mask,
      result.integral,
      result.detection,
    )

    expect(result.mask.values).toEqual(maskCopy)
    expect(result.detection.horizontal.lineCenters).toEqual(lineCopy)
    expect(topology).not.toHaveProperty('start')
    expect(topology).not.toHaveProperty('goal')
    expect(topology).not.toHaveProperty('map')
  })

  it('约 2000 x 2000、75 x 75 完整拓扑分析记录实际耗时', () => {
    const passages = spanningPassages(75, 75)
    const generated = generateMazeMaskFromPassages(
      {
        rows: 75,
        columns: 75,
        cellWidth: 26,
        wallThickness: 3,
        openings: false,
      },
      passages,
    )
    const integral = buildIntegralImage(generated.mask)
    const detection = detectOrthogonalMaze(generated.mask, integral)
    expect(detection.detected).toBe(true)
    const startedAt = performance.now()
    const topology = analyzeOrthogonalTopology(
      generated.mask,
      integral,
      detection,
    )
    const elapsed = performance.now() - startedAt

    console.info(
      `[topology benchmark] ${generated.mask.width}x` +
      `${generated.mask.height}, 75x75, ${elapsed.toFixed(1)} ms`,
    )
    expect(topology.adjacencyEdges).toHaveLength(passages.length)
    expect(topology.metrics.connectedComponents).toBe(1)
  })
})
