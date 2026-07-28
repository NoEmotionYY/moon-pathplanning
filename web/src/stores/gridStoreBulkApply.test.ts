import { createPinia, setActivePinia } from 'pinia'
import { watch } from 'vue'
import type { GridMapDocument } from '@/types/grid'
import { useGridStore } from './grid'

const createDocument = (size: number): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width: size,
  height: size,
  start: [0, 0],
  goal: [size - 1, size - 1],
  movement: 'eight_way',
  obstacles: Array.from({ length: size * size }, (_, index) => [
    index % size,
    Math.floor(index / size),
  ] as [number, number]).filter(
    ([x, y]) => !(x === 0 && y === 0) && !(x === size - 1 && y === size - 1),
  ),
  terrain: [],
})

describe('gridStoreBulkApply', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('一次替换完整地图且 mapVersion 只增加一次', () => {
    const grid = useGridStore()
    const before = grid.version
    const document = createDocument(20)

    grid.applyGridMapDocument(document)

    expect(grid.version).toBe(before + 1)
    expect(grid.toDocument()).toEqual(document)
    expect(grid.dirty).toBe(false)
  })

  it('同步观察者只看到旧地图或完整新地图，不看到中间状态', () => {
    const grid = useGridStore()
    const observations: Array<[number, number, number]> = []
    const stop = watch(
      () => [grid.width, grid.height, grid.obstacles.length] as const,
      ([width, height, obstacleCount]) => {
        observations.push([width, height, obstacleCount])
      },
      { flush: 'sync' },
    )
    const document = createDocument(10)

    grid.applyGridMapDocument(document)
    stop()

    expect(observations).toEqual([
      [document.width, document.height, document.obstacles.length],
    ])
  })

  it('可原子恢复指定版本和 dirty 状态', () => {
    const grid = useGridStore()
    const original = grid.toDocument()
    grid.applyGridMapDocument(createDocument(10))

    grid.restoreGridMapSnapshot({
      document: original,
      mapVersion: 37,
      dirty: true,
    })

    expect(grid.version).toBe(37)
    expect(grid.dirty).toBe(true)
    expect(grid.toDocument()).toEqual(original)
  })

  it('批量应用和回滚都会清除旧 hoveredCell', () => {
    const grid = useGridStore()
    const original = grid.toDocument()
    grid.hoveredCell = { x: 19, y: 19 }

    grid.applyGridMapDocument(createDocument(10))
    expect(grid.hoveredCell).toBeNull()

    grid.hoveredCell = { x: 9, y: 9 }
    grid.restoreGridMapSnapshot({
      document: original,
      mapVersion: 0,
      dirty: false,
    })
    expect(grid.hoveredCell).toBeNull()
  })

  it('记录 59×59 批量应用耗时，不设置脆弱阈值', () => {
    const grid = useGridStore()
    const document = createDocument(59)
    const startedAt = performance.now()
    grid.applyGridMapDocument(document)
    const elapsedMs = performance.now() - startedAt

    console.info(`[gridStoreBulkApply] 59×59: ${elapsedMs.toFixed(3)} ms`)
    expect(Number.isFinite(elapsedMs)).toBe(true)
    expect(grid.version).toBe(1)
  })
})
