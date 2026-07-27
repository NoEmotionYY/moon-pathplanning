import { algorithms, algorithmCategories, getAlgorithm } from './algorithms'

describe('算法元数据', () => {
  it('覆盖 12 种算法且 ID 唯一', () => {
    expect(algorithms).toHaveLength(12)
    expect(new Set(algorithms.map((item) => item.id)).size).toBe(12)
    expect(getAlgorithm('astar')?.name).toBe('A*')
  })

  it('覆盖四类算法并标注增量阶段', () => {
    expect(new Set(algorithms.map((item) => item.category))).toEqual(new Set(algorithmCategories))
    expect(getAlgorithm('lpa_star')?.isExperimental).toBe(true)
    expect(getAlgorithm('d_star_lite')?.isExperimental).toBe(true)
  })

  it('仅为已接入真实 MoonBit 追踪的算法标记支持回放', () => {
    expect(getAlgorithm('bfs')?.supportsTrace).toBe(true)
    expect(getAlgorithm('dfs')?.supportsTrace).toBe(true)
    expect(getAlgorithm('dijkstra')?.supportsTrace).toBe(true)
    expect(getAlgorithm('astar')?.supportsTrace).toBe(true)
    expect(getAlgorithm('rrt')?.supportsTrace).toBe(false)
  })
})
