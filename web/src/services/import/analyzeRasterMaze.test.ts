import { describe, expect, it } from 'vitest'
import type { ImageMatrix } from '@/types/import'
import type { MazePassageDefinition } from '@/types/mazeTopology'
import { validateGridDocument } from '@/utils/validation'
import { analyzeRasterMaze } from './analyzeRasterMaze'
import {
  generateSpanningMazePassages,
  type OuterOpeningDefinition,
} from './testUtils/generateOrthogonalMazeMask'
import {
  createDiagonalImage,
  createHoneycombImage,
  createPipelineMazeFixture,
  createSolidImage,
} from './testUtils/generatePipelineImage'

const standardOpenings = (columns: number) => [
  { side: 'top' as const, cellIndex: 0 },
  { side: 'bottom' as const, cellIndex: columns - 1 },
]

const cloneBytes = (image: ImageMatrix): Uint8ClampedArray =>
  new Uint8ClampedArray(image.rgba)

const disconnectedFixture = (
  rows: number,
  columns: number,
): {
  passages: MazePassageDefinition[]
  openings: OuterOpeningDefinition[]
} => {
  const spanning = generateSpanningMazePassages(rows, columns)
  const cellIndex = (row: number, column: number) => row * columns + column
  const boundaryOpening = (index: number): OuterOpeningDefinition | null => {
    const row = Math.floor(index / columns)
    const column = index % columns
    if (row === 0) return { side: 'top', cellIndex: column }
    if (row === rows - 1) return { side: 'bottom', cellIndex: column }
    if (column === 0) return { side: 'left', cellIndex: row }
    if (column === columns - 1) return { side: 'right', cellIndex: row }
    return null
  }
  for (let removed = 0; removed < spanning.length; removed += 1) {
    const passages = spanning.filter((_, index) => index !== removed)
    const adjacency = Array.from(
      { length: rows * columns },
      () => [] as number[],
    )
    for (const passage of passages) {
      const first = cellIndex(passage.from.row, passage.from.column)
      const second = cellIndex(passage.to.row, passage.to.column)
      adjacency[first]!.push(second)
      adjacency[second]!.push(first)
    }
    const firstComponent = new Set<number>([0])
    const queue = [0]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const next of adjacency[current]!) {
        if (!firstComponent.has(next)) {
          firstComponent.add(next)
          queue.push(next)
        }
      }
    }
    if (
      firstComponent.size < 2 ||
      rows * columns - firstComponent.size < 2
    ) {
      continue
    }
    const firstBoundary = [...firstComponent]
      .map(boundaryOpening)
      .find((opening): opening is OuterOpeningDefinition =>
        opening !== null)
    const secondBoundary = Array.from(
      { length: rows * columns },
      (_, index) => index,
    )
      .filter((index) => !firstComponent.has(index))
      .map(boundaryOpening)
      .find((opening): opening is OuterOpeningDefinition =>
        opening !== null)
    if (firstBoundary && secondBoundary) {
      return {
        passages,
        openings: [firstBoundary, secondBoundary],
      }
    }
  }
  throw new Error('无法构造不连通测试迷宫。')
}

describe('analyzeRasterMaze', () => {
  it.each([
    { rows: 5, columns: 5, wallThickness: 1 },
    { rows: 8, columns: 10, wallThickness: 3 },
    { rows: 20, columns: 20, wallThickness: 5 },
  ])(
    '$rows×$columns、墙宽 $wallThickness 完整图片管线成功',
    async ({ rows, columns, wallThickness }) => {
      const source = createPipelineMazeFixture({
        rows,
        columns,
        wallThickness,
      })
      const original = cloneBytes(source)
      const result = await analyzeRasterMaze(source)
      expect(result.status).toBe('success')
      expect(result.completedStage).toBe('completed')
      expect(result.document).not.toBeNull()
      expect(result.sourceImage).toBe(source)
      expect(result.transformedImage).not.toBe(source)
      expect(source.rgba.every(
        (value, index) => value === original[index],
      )).toBe(true)
      expect(result.preprocess).not.toBeNull()
      expect(result.orthogonalDetection).toMatchObject({
        detected: true,
        rows,
        columns,
      })
      expect(result.topology).toMatchObject({
        analyzed: true,
        rows,
        columns,
      })
      expect(result.entranceSelection).toMatchObject({
        status: 'selected',
      })
      expect(result.conversion?.success).toBe(true)
      expect(result.document).toMatchObject({
        width: columns * 2 + 1,
        height: rows * 2 + 1,
      })
      validateGridDocument(result.document, { maximumSize: 151 })
      expect(result.diagnostics).toMatchObject({
        sourceWidth: source.width,
        sourceHeight: source.height,
        transformedWidth: source.width,
        transformedHeight: source.height,
        croppedWidth: columns * 12 + wallThickness + 2,
        croppedHeight: rows * 12 + wallThickness + 2,
        detectedRows: rows,
        detectedColumns: columns,
        entranceCandidateCount: 2,
        convertedWidth: columns * 2 + 1,
        convertedHeight: rows * 2 + 1,
      })
      expect(result.diagnostics.obstacleCount).toBeGreaterThan(0)
      expect(result.diagnostics.walkableCount).toBeGreaterThan(0)
    },
    15_000,
  )

  it.each([
    {
      name: '深色背景浅墙',
      fixture: { wallColor: 'light' as const },
      transform: {},
    },
    {
      name: '透明背景',
      fixture: { transparentBackground: true },
      transform: {},
    },
    {
      name: '水平翻转',
      fixture: {},
      transform: { flipHorizontal: true },
    },
    {
      name: '垂直翻转',
      fixture: {},
      transform: { flipVertical: true },
    },
    {
      name: '反色',
      fixture: {},
      transform: { invert: true },
    },
  ])('$name 可完成识别', async ({ fixture, transform }) => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 8,
        columns: 10,
        wallThickness: 3,
        ...fixture,
      }),
      { transform },
    )
    expect(result.status).toBe('success')
    expect(result.orthogonalDetection).toMatchObject({
      detected: true,
      rows: 8,
      columns: 10,
    })
  })

  it('旋转 90° 后行列互换且诊断尺寸同步交换', async () => {
    const source = createPipelineMazeFixture({
      rows: 8,
      columns: 10,
      wallThickness: 3,
    })
    const result = await analyzeRasterMaze(source, {
      transform: { rotation: 90 },
    })
    expect(result.status).toBe('success')
    expect(result.orthogonalDetection).toMatchObject({
      rows: 10,
      columns: 8,
    })
    expect(result.diagnostics).toMatchObject({
      transformedWidth: source.height,
      transformedHeight: source.width,
      convertedWidth: 17,
      convertedHeight: 21,
    })
  })

  it('固定少量噪声和宽入口沿用现有规则', async () => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 8,
        columns: 10,
        wallThickness: 3,
        noisePixels: 1,
        openings: [
          { side: 'top', cellIndex: 2, widthInCells: 2 },
          { side: 'bottom', cellIndex: 7 },
        ],
      }),
    )
    expect(result.status).toBe('success')
    expect(result.entranceSelection?.candidates).toHaveLength(2)
    expect(result.entranceSelection?.candidates.find(
      (candidate) => candidate.side === 'top',
    )).toMatchObject({ widthInCells: 2 })
  })

  it('uncertain 内部通道按默认转换规则保持为墙', async () => {
    const rows = 8
    const columns = 10
    const cellWidth = 12
    const wallThickness = 3
    const padding = 8
    const passages = generateSpanningMazePassages(rows, columns)
    const passageKeys = new Set(passages.map((passage) => {
      const first = passage.from.row * columns + passage.from.column
      const second = passage.to.row * columns + passage.to.column
      return `${Math.min(first, second)}:${Math.max(first, second)}`
    }))
    let damaged: { row: number; column: number } | null = null
    for (let row = 0; row < rows && !damaged; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const first = row * columns + column
        if (!passageKeys.has(`${first}:${first + 1}`)) {
          damaged = { row, column }
          break
        }
      }
    }
    expect(damaged).not.toBeNull()
    const source = createPipelineMazeFixture({
      rows,
      columns,
      cellWidth,
      wallThickness,
      padding,
      passages,
    })
    const wallX = padding + (damaged!.column + 1) * cellWidth
    const damageY = padding + damaged!.row * cellWidth + 5
    for (let y = damageY; y < damageY + 5; y += 1) {
      for (let x = wallX; x < wallX + wallThickness; x += 1) {
        const offset = (y * source.width + x) * 4
        source.rgba[offset] = 255
        source.rgba[offset + 1] = 255
        source.rgba[offset + 2] = 255
        source.rgba[offset + 3] = 255
      }
    }
    const result = await analyzeRasterMaze(
      source,
    )
    expect(result.status).toBe('success')
    const boundaries = [
      ...(result.topology?.horizontalInternalBoundaries ?? []),
      ...(result.topology?.verticalInternalBoundaries ?? []),
    ]
    const uncertain = boundaries.find(
      (boundary) => boundary.evidence.state === 'uncertain',
    )
    expect(uncertain).toBeDefined()
    const sameRow = uncertain!.from.row === uncertain!.to.row
    const point: [number, number] = sameRow
      ? [
          Math.max(
            uncertain!.from.column,
            uncertain!.to.column,
          ) * 2,
          uncertain!.from.row * 2 + 1,
        ]
      : [
          uncertain!.from.column * 2 + 1,
          Math.max(uncertain!.from.row, uncertain!.to.row) * 2,
        ]
    expect(result.document?.obstacles).toContainEqual(point)
  })

  it.each([
    {
      name: '无入口',
      openings: [],
      status: 'none',
    },
    {
      name: '单入口',
      openings: [{ side: 'top' as const, cellIndex: 0 }],
      status: 'single',
    },
    {
      name: '多入口',
      openings: [
        { side: 'top' as const, cellIndex: 0 },
        { side: 'right' as const, cellIndex: 2 },
        { side: 'bottom' as const, cellIndex: 4 },
      ],
      status: 'ambiguous',
    },
  ])('$name 返回 manual-input-required 并保留中间结果', async ({
    openings,
    status,
  }) => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 5,
        columns: 5,
        openings,
      }),
    )
    expect(result.status).toBe('manual-input-required')
    expect(result.completedStage).toBe('entrance-selection')
    expect(result.entranceSelection?.status).toBe(status)
    expect(result.preprocess).not.toBeNull()
    expect(result.orthogonalDetection?.detected).toBe(true)
    expect(result.topology?.analyzed).toBe(true)
    expect(result.conversion).toBeNull()
    expect(result.document).toBeNull()
    expect(result.diagnostics.convertedWidth).toBeNull()
  })

  it('低置信度入口返回 manual-input-required', async () => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({ rows: 5, columns: 5 }),
      {
        entranceDetection: {
          minimumAutomaticPairConfidence: 1,
        },
      },
    )
    expect(result.status).toBe('manual-input-required')
    expect(result.entranceSelection?.status).toBe('low-confidence')
    expect(result.conversion).toBeNull()
  })

  it('不连通入口不自动生成文档', async () => {
    const rows = 8
    const columns = 10
    const { passages, openings } = disconnectedFixture(rows, columns)
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows,
        columns,
        passages,
        openings,
      }),
    )
    expect(result.status).toBe('manual-input-required')
    expect(result.entranceSelection?.status).toBe('disconnected')
    expect(result.document).toBeNull()
    expect(result.warnings.some(
      (warning) => warning.code === 'ENTRANCE_PAIR_DISCONNECTED',
    )).toBe(true)
    const candidates = result.entranceSelection!.candidates
    const manual = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows,
        columns,
        passages,
        openings,
      }),
      {
        manualEntrancePair: {
          firstCandidateId: candidates[0]!.id,
          secondCandidateId: candidates[1]!.id,
        },
      },
    )
    expect(manual.status).toBe('failed')
    expect(manual.error?.code).toBe('ENTRANCE_PAIR_DISCONNECTED')
  })

  it.each([
    ['蜂窝图', createHoneycombImage()],
    ['斜线图', createDiagonalImage()],
  ])('%s 返回 unsupported-topology', async (_, source) => {
    const result = await analyzeRasterMaze(source)
    expect(result.status).toBe('unsupported-topology')
    expect(result.completedStage).toBe('orthogonal-detection')
    expect(result.preprocess).not.toBeNull()
    expect(result.orthogonalDetection?.detected).toBe(false)
    expect(result.topology).toBeNull()
    expect(result.document).toBeNull()
    expect(result.diagnostics.detectedRows).toBeNull()
  })

  it.each([
    ['纯白图', createSolidImage(80, 80, 255)],
    ['纯黑图', createSolidImage(80, 80, 0)],
  ])('%s 返回 failed 且后续字段为空', async (_, source) => {
    const result = await analyzeRasterMaze(source)
    expect(result.status).toBe('failed')
    expect(result.completedStage).toBe('preprocess')
    expect(result.error?.stage).toBe('preprocess')
    expect(['WALL_MASK_EMPTY', 'WALL_MASK_FULL']).toContain(
      result.error?.code,
    )
    expect(result.transformedImage).not.toBeNull()
    expect(result.preprocess).toBeNull()
    expect(result.orthogonalDetection).toBeNull()
    expect(result.topology).toBeNull()
    expect(result.document).toBeNull()
  })

  it('无效 RGBA 在 validation 阶段失败', async () => {
    const source: ImageMatrix = {
      width: 10,
      height: 10,
      rgba: new Uint8ClampedArray(12),
    }
    const result = await analyzeRasterMaze(source)
    expect(result).toMatchObject({
      status: 'failed',
      completedStage: 'validation',
      transformedImage: null,
      preprocess: null,
      error: {
        code: 'IMAGE_PIXEL_DATA_INVALID',
        stage: 'validation',
      },
    })
  })

  it('已取消和阶段间取消均停止后续工作且不返回 document', async () => {
    const source = createPipelineMazeFixture({ rows: 5, columns: 5 })
    const alreadyCancelled = new AbortController()
    alreadyCancelled.abort()
    const first = await analyzeRasterMaze(
      source,
      {},
      alreadyCancelled.signal,
    )
    expect(first).toMatchObject({
      status: 'cancelled',
      document: null,
      error: { code: 'IMPORT_CANCELLED', stage: 'validation' },
    })
    expect(first.timings).toHaveLength(0)

    const betweenStages = new AbortController()
    const progressStages: string[] = []
    const second = await analyzeRasterMaze(
      source,
      {},
      betweenStages.signal,
      (progress) => {
        progressStages.push(progress.stage)
        if (
          progress.stage === 'transform' &&
          progress.message.endsWith('完成')
        ) {
          betweenStages.abort()
        }
      },
    )
    expect(second.status).toBe('cancelled')
    expect(second.completedStage).toBe('transform')
    expect(second.preprocess).toBeNull()
    expect(second.document).toBeNull()
    expect(progressStages).not.toContain('preprocess')
  })

  it('进度固定有序且回调异常仅转为警告', async () => {
    const updates: Array<{ stage: string; progress: number }> = []
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({ rows: 5, columns: 5 }),
      {},
      undefined,
      (progress) => {
        updates.push({
          stage: progress.stage,
          progress: progress.progress,
        })
        if (progress.stage === 'preprocess') {
          throw new Error('consumer failed')
        }
      },
    )
    expect(result.status).toBe('success')
    expect(updates.at(-1)).toEqual({ stage: 'completed', progress: 1 })
    expect(updates.every((value, index) =>
      index === 0 || value.progress >= updates[index - 1]!.progress))
      .toBe(true)
    expect(result.warnings.filter(
      (warning) => warning.code === 'IMPORT_PROGRESS_CALLBACK_FAILED',
    )).toHaveLength(1)
  })

  it('ambiguous 可用合法手动候选对转换，顺序稳定决定 start/goal', async () => {
    const source = createPipelineMazeFixture({
      rows: 5,
      columns: 5,
      openings: [
        { side: 'top', cellIndex: 0 },
        { side: 'right', cellIndex: 2 },
        { side: 'bottom', cellIndex: 4 },
      ],
    })
    const analyzed = await analyzeRasterMaze(source)
    expect(analyzed.entranceSelection?.status).toBe('ambiguous')
    const pair = analyzed.entranceSelection?.pairCandidates.find(
      (candidate) => candidate.connected && candidate.sameComponent,
    )
    expect(pair).toBeDefined()
    const selectionSnapshot = analyzed.entranceSelection
    const result = await analyzeRasterMaze(source, {
      manualEntrancePair: {
        firstCandidateId: pair!.second.id,
        secondCandidateId: pair!.first.id,
      },
    })
    expect(result.status).toBe('success')
    expect(result.conversion?.startSource?.id).toBe(pair!.second.id)
    expect(result.conversion?.goalSource?.id).toBe(pair!.first.id)
    expect(analyzed.entranceSelection).toBe(selectionSnapshot)
    expect(analyzed.entranceSelection?.status).toBe('ambiguous')
  })

  it.each([
    {
      name: '不存在的 ID',
      pair: {
        firstCandidateId: 'missing',
        secondCandidateId: 'also-missing',
      },
    },
    {
      name: '相同 ID',
      pair: {
        firstCandidateId: 'top:0-0',
        secondCandidateId: 'top:0-0',
      },
    },
  ])('手动入口 $name 返回 failed', async ({ pair }) => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 5,
        columns: 5,
        openings: [
          { side: 'top', cellIndex: 0 },
          { side: 'right', cellIndex: 2 },
          { side: 'bottom', cellIndex: 4 },
        ],
      }),
      { manualEntrancePair: pair },
    )
    expect(result.status).toBe('failed')
    expect(result.completedStage).toBe('grid-conversion')
    expect(result.error).toMatchObject({
      code: 'GRID_CONVERSION_ENTRANCE_INVALID',
      stage: 'grid-conversion',
    })
    expect(result.document).toBeNull()
  })

  it('76×76 转换尺寸超过 hardMax 后失败', async () => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 76,
        columns: 76,
        cellWidth: 6,
        wallThickness: 1,
      }),
      {
        orthogonalDetection: {
          maximumCellCount: 76,
        },
      },
    )
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('GRID_CONVERSION_SIZE_EXCEEDED')
    expect(result.completedStage).toBe('grid-conversion')
    expect(result.document).toBeNull()
  }, 30_000)

  it('75×75 完整流水线生成 151×151 并输出阶段耗时', async () => {
    const result = await analyzeRasterMaze(
      createPipelineMazeFixture({
        rows: 75,
        columns: 75,
        cellWidth: 6,
        wallThickness: 1,
      }),
    )
    console.info(
      '[pipeline benchmark] 75x75',
      Object.fromEntries(result.timings.map(
        (timing) => [timing.stage, timing.durationMs.toFixed(1)],
      )),
      `total=${result.totalDurationMs.toFixed(1)}ms`,
    )
    expect(result.status).toBe('success')
    expect(result.document).toMatchObject({ width: 151, height: 151 })
    expect(result.timings.map((timing) => timing.stage)).toEqual([
      'validation',
      'transform',
      'preprocess',
      'orthogonal-detection',
      'topology-analysis',
      'entrance-selection',
      'grid-conversion',
      'document-validation',
    ])
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(
      result.timings.reduce((sum, timing) => sum + timing.durationMs, 0),
    )
  }, 30_000)
})
