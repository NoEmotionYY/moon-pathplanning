import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import type { GridMapDocument } from '@/types/grid'
import type { PlannerResult } from '@/types/planner'
import { useMapImportExport } from './useMapImportExport'

const document = (size = 10): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width: size,
  height: size,
  start: [0, 0],
  goal: [size - 1, size - 1],
  movement: 'four_way',
  obstacles: [[2, 2]],
  terrain: [],
})

const fileFor = (value: GridMapDocument): File => ({
  name: 'map.json',
  type: 'application/json',
  size: JSON.stringify(value).length,
  text: async () => JSON.stringify(value),
} as File)

const plannerResult: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'astar',
  movement: 'four_way',
  path: [[0, 0], [1, 0]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  error: null,
}

describe('useMapImportExport JSON 旧流程回归', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('JSON 文件仍通过原入口导入并清理旧 Planner 结果', async () => {
    const grid = useGridStore()
    const planner = usePlannerStore()
    planner.begin('json-old', grid.version, 'astar')
    planner.complete(
      'json-old',
      plannerResult,
      2,
      grid.version,
      'astar',
    )
    const previousVersion = grid.version

    await useMapImportExport().importFile(fileFor(document(10)))

    expect(grid.width).toBe(10)
    expect(grid.height).toBe(10)
    expect(grid.version).toBe(previousVersion + 1)
    expect(planner.result).toBeNull()
    expect(planner.status).toBe('idle')
  })

  it('JSON 仍允许 60×60，拒绝 61×61', async () => {
    const importer = useMapImportExport()
    await expect(importer.importFile(fileFor(document(60)))).resolves.toBeUndefined()
    await expect(importer.importFile(fileFor(document(61)))).rejects.toThrow(
      '60×60',
    )
  })
})
