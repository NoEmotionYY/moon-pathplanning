import { createPinia, setActivePinia } from 'pinia'
import { useGridStore } from '@/stores/grid'
import { parseGridJson } from './validation'

describe('地图导入导出往返', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('保持障碍、地形、移动方式与端点', () => {
    const grid = useGridStore()
    grid.movement = 'eight_way'
    grid.activeTool = 'obstacle'
    grid.applyTool({ x: 3, y: 4 })
    grid.activeTool = 'terrain'
    grid.terrainCost = 8
    grid.applyTool({ x: 5, y: 6 })

    const parsed = parseGridJson(JSON.stringify(grid.toDocument()))
    expect(parsed.movement).toBe('eight_way')
    expect(parsed.obstacles).toContainEqual([3, 4])
    expect(parsed.terrain).toContainEqual({ point: [5, 6], cost: 8 })
  })
})
