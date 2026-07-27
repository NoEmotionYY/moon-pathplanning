import { describe, expect, it } from 'vitest'
import { ORTHOGONAL_DETECTION_DEFAULTS } from '@/config/orthogonalDetection'
import type { BinaryMask } from '@/types/imageAnalysis'
import type { AxisGridEstimate } from '@/types/orthogonalMaze'
import {
  calculateOrthogonalityGate,
  detectOrthogonalMaze,
} from './orthogonalMazeDetector'
import { generateOrthogonalMazeMask } from './testUtils/generateOrthogonalMazeMask'

const expectAxisLineInvariant = (axis: AxisGridEstimate): void => {
  if (axis.detected) {
    expect(axis.lineCenters).toHaveLength(axis.cellCount + 1)
  } else {
    expect(axis.cellCount).toBe(0)
    expect(axis.lineCenters).toHaveLength(0)
  }
}

const drawLine = (
  mask: BinaryMask,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void => {
  let x = Math.round(fromX)
  let y = Math.round(fromY)
  const endX = Math.round(toX)
  const endY = Math.round(toY)
  const deltaX = Math.abs(endX - x)
  const deltaY = Math.abs(endY - y)
  const stepX = x < endX ? 1 : -1
  const stepY = y < endY ? 1 : -1
  let error = deltaX - deltaY

  while (true) {
    if (x >= 0 && x < mask.width && y >= 0 && y < mask.height) {
      mask.values[y * mask.width + x] = 1
    }
    if (x === endX && y === endY) {
      break
    }
    const twiceError = error * 2
    if (twiceError > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (twiceError < deltaX) {
      error += deltaX
      y += stepY
    }
  }
}

const diagonalMask = (size: number): BinaryMask => {
  const values = new Uint8Array(size * size)
  for (let index = 1; index < size - 1; index += 1) {
    values[index * size + index] = 1
    values[index * size + (size - index - 1)] = 1
  }
  return { width: size, height: size, values }
}

const hexagonalMask = (): BinaryMask => {
  const size = 220
  const radius = 14
  const mask = {
    width: size,
    height: size,
    values: new Uint8Array(size * size),
  }
  const verticalStep = Math.sqrt(3) * radius
  for (let column = 0; column < 9; column += 1) {
    for (let row = 0; row < 8; row += 1) {
      const centerX = 20 + column * radius * 1.5
      const centerY =
        20 +
        row * verticalStep +
        (column % 2 === 0 ? 0 : verticalStep / 2)
      const vertices = Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3
        return [
          centerX + radius * Math.cos(angle),
          centerY + radius * Math.sin(angle),
        ] as const
      })
      for (let index = 0; index < vertices.length; index += 1) {
        const from = vertices[index]
        const to = vertices[(index + 1) % vertices.length]
        if (from && to) {
          drawLine(mask, from[0], from[1], to[0], to[1])
        }
      }
    }
  }
  return mask
}

const outerFrameMask = (size: number): BinaryMask => {
  const values = new Uint8Array(size * size)
  for (let index = 0; index < size; index += 1) {
    values[index] = 1
    values[(size - 1) * size + index] = 1
    values[index * size] = 1
    values[index * size + size - 1] = 1
  }
  return { width: size, height: size, values }
}

const irregularGridMask = (): BinaryMask => {
  const width = 80
  const height = 78
  const values = new Uint8Array(width * height)
  const horizontal = [0, 8, 21, 37, 56, 77]
  const vertical = [0, 7, 19, 36, 58, 79]
  for (const y of horizontal) {
    values.fill(1, y * width, (y + 1) * width)
  }
  for (const x of vertical) {
    for (let y = 0; y < height; y += 1) {
      values[y * width + x] = 1
    }
  }
  return { width, height, values }
}

describe('detectOrthogonalMaze', () => {
  it.each([
    { rows: 5, columns: 5, pitch: 12, thickness: 1 },
    { rows: 8, columns: 10, pitch: 10, thickness: 3 },
    { rows: 20, columns: 20, pitch: 8, thickness: 5 },
  ])(
    '识别 $rows x $columns、墙厚 $thickness 的迷宫',
    ({ rows, columns, pitch, thickness }) => {
      const mask = generateOrthogonalMazeMask({
        rows,
        columns,
        cellWidth: pitch,
        wallThickness: thickness,
        padding: 2,
        seed: 42,
        noiseRatio: 0.001,
      })
      const result = detectOrthogonalMaze(mask)

      expect(result.detected).toBe(true)
      expect(result.rows).toBe(rows)
      expect(result.columns).toBe(columns)
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
      expectAxisLineInvariant(result.horizontal)
      expectAxisLineInvariant(result.vertical)
    },
  )

  it('容忍两个外框开口、固定噪声和少量缺段', () => {
    const mask = generateOrthogonalMazeMask({
      rows: 8,
      columns: 10,
      cellWidth: 12,
      seed: 2026,
      noiseRatio: 0.002,
      missingSegmentRatio: 0.08,
      openings: [
        { side: 'top', cellIndex: 0 },
        { side: 'bottom', cellIndex: 9 },
      ],
    })

    const result = detectOrthogonalMaze(mask)
    expect(result.detected).toBe(true)
    expect([result.rows, result.columns]).toEqual([8, 10])
    expect(result.confidence).toBeGreaterThanOrEqual(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumOverallConfidence,
    )
    expectAxisLineInvariant(result.horizontal)
    expectAxisLineInvariant(result.vertical)
  })

  it('大量缺段会失败或显著降低置信度', () => {
    const complete = detectOrthogonalMaze(generateOrthogonalMazeMask({
      rows: 10,
      columns: 10,
      cellWidth: 10,
      seed: 7,
    }))
    const damaged = detectOrthogonalMaze(generateOrthogonalMazeMask({
      rows: 10,
      columns: 10,
      cellWidth: 10,
      seed: 7,
      missingSegmentRatio: 0.75,
    }))
    expect(
      !damaged.detected || damaged.confidence < complete.confidence,
    ).toBe(true)
  })

  it.each([
    ['斜线', diagonalMask(80)],
    ['只有外框', outerFrameMask(80)],
  ])('%s 不会被高置信度识别', (_name, mask) => {
    const result = detectOrthogonalMaze(mask)
    expect(result.detected).toBe(false)
    expect(result.rows).toBe(0)
    expect(result.columns).toBe(0)
    expect(result.confidence).toBeLessThan(0.35)
    expectAxisLineInvariant(result.horizontal)
    expectAxisLineInvariant(result.vertical)
  })

  it('随机孤立噪声不会被识别', () => {
    const values = new Uint8Array(100 * 100)
    let state = 17
    for (let index = 0; index < 300; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      values[state % values.length] = 1
    }
    const result = detectOrthogonalMaze({ width: 100, height: 100, values })
    expect(result.detected).toBe(false)
    expectAxisLineInvariant(result.horizontal)
    expectAxisLineInvariant(result.vertical)
  })

  it('双轴周期明显的六边形结构仍保持低总体置信度', () => {
    const result = detectOrthogonalMaze(hexagonalMask())

    expect(result.horizontal.confidence).toBeGreaterThan(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumAxisConfidence,
    )
    expect(result.vertical.confidence).toBeGreaterThan(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumAxisConfidence,
    )
    expect(result.orthogonalityScore).toBeLessThan(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumOrthogonalityScore,
    )
    expect(result.confidence).toBeLessThan(0.35)
    expect(result.confidence).toBeLessThan(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumOverallConfidence,
    )
    expect(result.detected).toBe(false)
    expectAxisLineInvariant(result.horizontal)
    expectAxisLineInvariant(result.vertical)
  })

  it('正交门控在阈值以下为零并始终限制在 0 到 1', () => {
    const minimum =
      ORTHOGONAL_DETECTION_DEFAULTS.minimumOrthogonalityScore
    const scores = [0, minimum, 0.4, minimum * 2, 1]
    const gates = scores.map((score) =>
      calculateOrthogonalityGate(score, minimum),
    )

    expect(gates[0]).toBe(0)
    expect(gates[1]).toBe(0)
    expect(gates.at(-1)).toBe(1)
    expect(gates.every((gate) => gate >= 0 && gate <= 1)).toBe(true)
    expect(gates.every((gate, index) =>
      index === 0 || gate >= (gates[index - 1] ?? gate),
    )).toBe(true)
  })

  it('明显不规则间距网格不会被高置信度识别', () => {
    const result = detectOrthogonalMaze(irregularGridMask())
    expect(result.detected).toBe(false)
    expect(result.confidence).toBeLessThan(
      ORTHOGONAL_DETECTION_DEFAULTS.minimumOverallConfidence,
    )
  })

  it('不会修改输入蒙版', () => {
    const mask = generateOrthogonalMazeMask({
      rows: 5,
      columns: 6,
      cellWidth: 10,
    })
    const original = mask.values.slice()
    detectOrthogonalMaze(mask)
    expect(mask.values).toEqual(original)
  })
})
