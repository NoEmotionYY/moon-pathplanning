import { cropBinaryMask, cropImageMatrix } from './imageCrop'
import { createImage, maskFromRows } from './imageTestUtils'

describe('图像和蒙版安全裁剪', () => {
  it('正确复制 RGBA 坐标且不修改输入', () => {
    const image = createImage(4, 3, (x, y) => {
      const value = y * 4 + x
      return [value, value + 20, value + 40, 100 + value]
    })
    const before = [...image.rgba]
    const cropped = cropImageMatrix(image, {
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    })
    const reds = [...cropped.rgba].filter((_value, index) => index % 4 === 0)
    expect(reds).toEqual([5, 6, 9, 10])
    expect([...image.rgba]).toEqual(before)
    expect(cropped.rgba).not.toBe(image.rgba)
  })

  it('正确复制单通道蒙版且不修改输入', () => {
    const mask = maskFromRows([
      [0, 1, 0, 1],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
    ])
    const before = [...mask.values]
    const cropped = cropBinaryMask(mask, {
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    })
    expect([...cropped.values]).toEqual([1, 0, 0, 1])
    expect([...mask.values]).toEqual(before)
    expect(cropped.values).not.toBe(mask.values)
  })

  it.each([
    { x: 0, y: 0, width: 0, height: 1 },
    { x: 3, y: 2, width: 2, height: 1 },
    { x: -1, y: 0, width: 1, height: 1 },
  ])('非法 bounds 被拒绝：%o', (bounds) => {
    expect(() => cropImageMatrix(
      createImage(4, 3, () => [0, 0, 0, 255]),
      bounds,
    )).toThrow(expect.objectContaining({
      code: 'CROP_BOUNDS_INVALID',
    }))
  })
})
