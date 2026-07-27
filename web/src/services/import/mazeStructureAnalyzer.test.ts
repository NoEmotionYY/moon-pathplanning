import { describe, expect, it } from 'vitest'
import { analyzeMazeStructure } from './mazeStructureAnalyzer'
import {
  binaryMaskToImageMatrix,
  generateOrthogonalMazeMask,
} from './testUtils/generateOrthogonalMazeMask'

describe('analyzeMazeStructure', () => {
  it.each([
    { wallColor: 'dark' as const, transparentBackground: false },
    { wallColor: 'light' as const, transparentBackground: false },
    { wallColor: 'dark' as const, transparentBackground: true },
  ])(
    '从 $wallColor 图像经过预处理识别行列',
    ({ wallColor, transparentBackground }) => {
      const mask = generateOrthogonalMazeMask({
        rows: 8,
        columns: 10,
        cellWidth: 12,
        wallThickness: 3,
        padding: 5,
      })
      const image = binaryMaskToImageMatrix(mask, {
        wallColor,
        transparentBackground,
      })
      const original = image.rgba.slice()
      const result = analyzeMazeStructure(image)

      expect(result.orthogonal.detected).toBe(true)
      expect(result.orthogonal.rows).toBe(8)
      expect(result.orthogonal.columns).toBe(10)
      expect(image.rgba).toEqual(original)
    },
  )

  it('约 2000 x 2000、75 x 75 输入记录实际耗时', () => {
    const mask = generateOrthogonalMazeMask({
      rows: 75,
      columns: 75,
      cellWidth: 26,
      wallThickness: 3,
      openings: true,
      seed: 75,
    })
    const image = binaryMaskToImageMatrix(mask)
    const startedAt = performance.now()
    const result = analyzeMazeStructure(image)
    const elapsed = performance.now() - startedAt

    console.info(
      `[orthogonal benchmark] ${mask.width}x${mask.height}, ` +
      `75x75, ${elapsed.toFixed(1)} ms`,
    )
    expect(result.orthogonal.rows).toBe(75)
    expect(result.orthogonal.columns).toBe(75)
  })
})
