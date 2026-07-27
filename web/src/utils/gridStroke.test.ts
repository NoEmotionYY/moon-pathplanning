import { cancelFromContextMenu, GridStrokeSession } from './gridStroke'

describe('GridStrokeSession', () => {
  it('连续插值并在同一笔画中跳过已处理单元', () => {
    const stroke = new GridStrokeSession()
    expect(stroke.start(7, { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }])
    expect(stroke.move(7, { x: 3, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
    expect(stroke.move(7, { x: 1, y: 0 })).toEqual([])
  })

  it('pointercancel 后停止处理移动', () => {
    const stroke = new GridStrokeSession()
    stroke.start(2, { x: 0, y: 0 })
    stroke.cancel()
    expect(stroke.active).toBe(false)
    expect(stroke.move(2, { x: 2, y: 0 })).toEqual([])
  })

  it('右键菜单会被阻止并取消当前笔画', () => {
    const preventDefault = vi.fn()
    const cancel = vi.fn()
    cancelFromContextMenu({ preventDefault }, cancel)
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
  })
})
