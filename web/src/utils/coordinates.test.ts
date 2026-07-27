import {
  buildPolylinePoints,
  clampPoint,
  getCellsBetween,
  keyToPoint,
  pointKey,
  toTuple,
} from './coordinates'

describe('坐标转换与插值', () => {
  it('在 Point、key 和 tuple 之间稳定转换', () => {
    expect(pointKey({ x: 3, y: 7 })).toBe('3,7')
    expect(keyToPoint('3,7')).toEqual({ x: 3, y: 7 })
    expect(toTuple({ x: 3, y: 7 })).toEqual([3, 7])
  })

  it('尺寸改变后将坐标限制在合法范围内', () => {
    expect(clampPoint({ x: 12, y: -2 }, 8, 6)).toEqual({ x: 7, y: 0 })
  })

  it('高速斜向移动时用 Bresenham 填满中间单元', () => {
    expect(getCellsBetween({ x: 1, y: 1 }, { x: 5, y: 3 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 3 },
    ])
  })

  it('用一组完整点生成整条 SVG polyline', () => {
    expect(buildPolylinePoints([[0, 0], [1, 0], [1, 1]], 20)).toBe('10,10 30,10 30,30')
  })
})
