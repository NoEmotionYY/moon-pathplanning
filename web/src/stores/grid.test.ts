import { createPinia, setActivePinia } from 'pinia'
import { useGridStore } from './grid'

describe('gridStore 确定性编辑', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('重复绘制障碍不会切换或重复写入', () => {
    const grid = useGridStore()
    expect(grid.setObstacle({ x: 2, y: 2 }, true)).toBe(true)
    expect(grid.setObstacle({ x: 2, y: 2 }, true)).toBe(false)
    expect(grid.obstacles.filter((key) => key === '2,2')).toHaveLength(1)
    expect(grid.setObstacle(grid.start, true)).toBe(false)
  })

  it('擦除同时清理障碍或加权地形', () => {
    const grid = useGridStore()
    grid.setObstacle({ x: 2, y: 2 }, true)
    grid.setTerrain({ x: 3, y: 3 }, 4)
    expect(grid.erasePoint({ x: 2, y: 2 })).toBe(true)
    expect(grid.erasePoint({ x: 3, y: 3 })).toBe(true)
    expect(grid.obstacleSet.has('2,2')).toBe(false)
    expect(grid.terrain['3,3']).toBeUndefined()
  })

  it('拒绝把起终点放到障碍物并可无损导出', () => {
    const grid = useGridStore()
    grid.setObstacle({ x: 5, y: 5 })
    expect(grid.setStart({ x: 5, y: 5 })).toBe(false)
    expect(grid.toDocument().obstacles).toContainEqual([5, 5])
  })
})
