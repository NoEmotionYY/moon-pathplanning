import { describe, expect, it } from 'vitest'
import {
  getConvertedGridDimensions,
  horizontalPassageToGridPoint,
  mazeCellToGridPoint,
  verticalPassageToGridPoint,
} from './orthogonalGridCoordinates'

describe('orthogonalGridCoordinates', () => {
  it.each([
    [2, 2, 5, 5],
    [5, 5, 11, 11],
    [8, 10, 21, 17],
    [20, 20, 41, 41],
    [75, 75, 151, 151],
    [76, 76, 153, 153],
  ])('%s x %s 转换为 %s x %s', (
    rows,
    columns,
    width,
    height,
  ) => {
    expect(getConvertedGridDimensions(rows, columns))
      .toEqual({ width, height })
  })

  it('逻辑单元映射到奇数坐标且最后一个单元正确', () => {
    expect(mazeCellToGridPoint({ row: 0, column: 0 }))
      .toEqual({ x: 1, y: 1 })
    expect(mazeCellToGridPoint({ row: 7, column: 9 }))
      .toEqual({ x: 19, y: 15 })
  })

  it('水平和垂直通道映射到唯一中间格', () => {
    expect(horizontalPassageToGridPoint(2, 3))
      .toEqual({ x: 8, y: 5 })
    expect(verticalPassageToGridPoint(2, 3))
      .toEqual({ x: 7, y: 6 })
  })

  it('拒绝负数、非整数和无效尺寸', () => {
    expect(() => mazeCellToGridPoint({ row: -1, column: 0 }))
      .toThrow()
    expect(() => horizontalPassageToGridPoint(0.5, 0))
      .toThrow()
    expect(() => getConvertedGridDimensions(0, 2))
      .toThrow()
  })
})
