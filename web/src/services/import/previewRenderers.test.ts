import { describe, expect, it, vi } from 'vitest'
import type { GridMapDocument } from '@/types/grid'
import type { MazeImportPreviewData } from '@/types/mazeImportWorker'
import { renderMazeDetectionPreview } from './mazeDetectionPreviewRenderer'
import { renderGridDocumentPreview } from './gridDocumentPreviewRenderer'

const createContext = () => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  imageSmoothingEnabled: true,
})

const createCanvas = () => {
  const context = createContext()
  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
  return { canvas, context }
}

const colors = {
  background: '#000',
  wall: '#111',
  grid: '#222',
  open: '#0f0',
  uncertain: '#ff0',
  entrance: '#00f',
  start: '#0f8',
  goal: '#f08',
}

describe('Canvas 预览 renderer', () => {
  it('结构 renderer 绘制墙体、格线和入口且不修改输入', () => {
    const preview: MazeImportPreviewData = {
      croppedMask: {
        width: 3,
        height: 3,
        values: new Uint8Array([
          1, 1, 1,
          1, 0, 1,
          1, 1, 1,
        ]),
      },
      horizontalLineCenters: [0, 2],
      verticalLineCenters: [0, 2],
      horizontalBoundaries: [],
      verticalBoundaries: [],
      outerBoundaries: [{
        side: 'left',
        cell: { row: 0, column: 0 },
        state: 'uncertain',
        confidence: 0.5,
      }],
      entranceCandidates: [{
        id: 'top:0-0',
        side: 'top',
        startIndex: 0,
        endIndex: 0,
        widthInCells: 1,
        representativeCell: { row: 0, column: 0 },
        confidence: 0.9,
        state: 'reliable',
        componentId: 0,
        componentSize: 1,
        warnings: [],
      }],
    }
    const before = {
      values: [...preview.croppedMask!.values],
      horizontal: [...preview.horizontalLineCenters],
      candidates: JSON.stringify(preview.entranceCandidates),
    }
    const { canvas, context } = createCanvas()
    renderMazeDetectionPreview(canvas, preview, {
      width: 320,
      height: 240,
      devicePixelRatio: 2,
      selectedCandidateIds: ['top:0-0', 'other'],
      colors,
    })
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
    expect(context.fillRect).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect([...preview.croppedMask!.values]).toEqual(before.values)
    expect(preview.horizontalLineCenters).toEqual(before.horizontal)
    expect(JSON.stringify(preview.entranceCandidates)).toBe(before.candidates)
  })

  it('151×151 地图 renderer 使用单 Canvas 批量绘制且不修改文档', () => {
    const document: GridMapDocument = {
      format: 'moon-pathplanning.grid.v1',
      width: 151,
      height: 151,
      start: [1, 0],
      goal: [149, 150],
      movement: 'four_way',
      obstacles: Array.from(
        { length: 151 },
        (_, x) => [x, 0] as [number, number],
      ),
      terrain: [],
    }
    const before = JSON.stringify(document)
    const { canvas, context } = createCanvas()
    renderGridDocumentPreview(canvas, document, {
      width: 360,
      height: 360,
      devicePixelRatio: 2,
      colors: {
        background: '#000',
        walkable: '#fff',
        obstacle: '#222',
        grid: '#555',
        start: '#0f0',
        goal: '#f00',
      },
    })
    expect(canvas.width).toBe(720)
    expect(context.fillRect.mock.calls.length).toBeLessThan(22801)
    expect(context.arc).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(document)).toBe(before)
  })
})
