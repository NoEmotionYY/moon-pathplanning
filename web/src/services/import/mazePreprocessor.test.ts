import { createSolidImage, createRectangularMaze } from './imageTestUtils'
import { preprocessMazeImage } from './mazePreprocessor'
import { queryIntegralRegion } from './integralImage'

describe('统一迷宫图像预处理入口', () => {
  it('简单矩形迷宫生成灰度、蒙版、裁剪和积分图', () => {
    const image = createRectangularMaze()
    const result = preprocessMazeImage(image)

    expect(result.polarity.polarity).toBe('dark-on-light')
    expect(result.grayscale.values).toHaveLength(image.width * image.height)
    expect(result.wallMask.values).toHaveLength(image.width * image.height)
    expect(result.content.found).toBe(true)
    expect(result.croppedImage.width).toBeLessThan(image.width)
    expect(result.croppedImage.height).toBeLessThan(image.height)
    expect(result.croppedMask.values).toHaveLength(
      result.croppedImage.width * result.croppedImage.height,
    )
    expect(result.integralMask.values).toHaveLength(
      (result.croppedMask.width + 1) * (result.croppedMask.height + 1),
    )
    expect(queryIntegralRegion(result.integralMask, {
      x: 0,
      y: 0,
      width: result.croppedMask.width,
      height: result.croppedMask.height,
    })).toBeGreaterThan(0)
    expect(result).not.toHaveProperty('map')
    expect(result).not.toHaveProperty('detectedRows')
    expect(result).not.toHaveProperty('topology')
  })

  it('浅墙深背景迷宫预处理成功', () => {
    const result = preprocessMazeImage(createRectangularMaze({
      background: [18, 18, 18, 255],
      wall: [235, 235, 235, 255],
    }))
    expect(result.polarity.polarity).toBe('light-on-dark')
    expect(result.content.found).toBe(true)
  })

  it('带大面积空白边距时裁剪到主体并保留 margin', () => {
    const image = createRectangularMaze({
      width: 40,
      height: 30,
      margin: 8,
    })
    const result = preprocessMazeImage(image, { cropMargin: 2 })
    expect(result.content.bounds).toEqual({
      x: 6,
      y: 6,
      width: 28,
      height: 18,
    })
  })

  it('透明背景按浅色合成并成功预处理', () => {
    const result = preprocessMazeImage(createRectangularMaze({
      background: [0, 0, 0, 0],
      wall: [15, 15, 15, 255],
    }))
    expect(result.polarity.polarity).toBe('dark-on-light')
    expect(result.grayscale.values[0]).toBe(255)
    expect(result.warnings.join()).toContain('默认按浅色处理')
  })

  it.each([
    ['纯白', 255],
    ['纯黑', 0],
  ] as const)('%s图片失败且不伪造结构', (_label, value) => {
    expect(() => preprocessMazeImage(
      createSolidImage(20, 20, [value, value, value, 255]),
    )).toThrow(expect.objectContaining({
      code: 'WALL_MASK_FULL',
    }))
  })

  it('显式阈值产生空蒙版时返回 WALL_MASK_EMPTY', () => {
    expect(() => preprocessMazeImage(
      createSolidImage(20, 20, [255, 255, 255, 255]),
      { wallThreshold: 0 },
    )).toThrow(expect.objectContaining({
      code: 'WALL_MASK_EMPTY',
    }))
  })

  it('不会修改原始 ImageMatrix', () => {
    const image = createRectangularMaze()
    const before = [...image.rgba]
    preprocessMazeImage(image)
    expect([...image.rgba]).toEqual(before)
  })

  it('墙体像素不足时返回明确内容错误', () => {
    const image = createSolidImage(20, 20, [245, 245, 245, 255])
    image.rgba[10 * image.width * 4 + 10 * 4] = 0
    image.rgba[10 * image.width * 4 + 10 * 4 + 1] = 0
    image.rgba[10 * image.width * 4 + 10 * 4 + 2] = 0
    expect(() => preprocessMazeImage(image, {
      wallThreshold: 100,
      minimumForegroundPixels: 1,
    })).toThrow(expect.objectContaining({
      code: 'MAZE_CONTENT_NOT_FOUND',
    }))
  })

  it('2000×2000 预处理保持线性数据结构并记录人工计时', () => {
    const image = createRectangularMaze({
      width: 2_000,
      height: 2_000,
      margin: 50,
    })
    const started = performance.now()
    const result = preprocessMazeImage(image)
    const elapsed = performance.now() - started

    expect(result.grayscale.values).toBeInstanceOf(Uint8Array)
    expect(result.wallMask.values).toBeInstanceOf(Uint8Array)
    expect(result.integralMask.values).toBeInstanceOf(Uint32Array)
    expect(result.content.found).toBe(true)
    console.info(`[maze-preprocess benchmark] 2000×2000: ${elapsed.toFixed(1)} ms`)
  })
})
