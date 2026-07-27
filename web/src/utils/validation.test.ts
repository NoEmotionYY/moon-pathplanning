import { parseGridJson, validateGridDocument } from './validation'

const validMap = {
  format: 'moon-pathplanning.grid.v1',
  width: 5,
  height: 5,
  start: [0, 0],
  goal: [4, 4],
  movement: 'four_way',
  obstacles: [[2, 2]],
  terrain: [{ point: [3, 3], cost: 4 }],
}

describe('地图校验与 JSON 导入', () => {
  it('接受项目 v1 地图格式', () => {
    expect(() => validateGridDocument(validMap)).not.toThrow()
    expect(parseGridJson(JSON.stringify(validMap)).width).toBe(5)
  })

  it('拒绝非法 JSON、越界坐标和端点障碍冲突', () => {
    expect(() => parseGridJson('{bad')).toThrow('无法解析 JSON')
    expect(() =>
      validateGridDocument({ ...validMap, start: [8, 0] }),
    ).toThrow('起点坐标无效')
    expect(() =>
      validateGridDocument({ ...validMap, obstacles: [[0, 0]] }),
    ).toThrow('起点不能位于障碍物中')
  })
})
