import { createApp, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  MazeImportConfirmationSummary,
} from '@/types/mazeImportApplication'
import MazeImportConfirmation from './MazeImportConfirmation.vue'

const summary: MazeImportConfirmationSummary = {
  width: 41,
  height: 41,
  obstacleCount: 880,
  terrainCount: 0,
  start: [1, 0],
  goal: [39, 40],
  movement: 'four_way',
  previousMapVersion: 12,
}

let app: ReturnType<typeof createApp> | null = null

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

const mountConfirmation = async (
  applying = false,
  onCancel = vi.fn(),
  onConfirm = vi.fn(),
) => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(MazeImportConfirmation, {
    summary,
    applying,
    onCancel,
    onConfirm,
  })
  app.mount(host)
  await nextTick()
  return { host, onCancel, onConfirm }
}

describe('MazeImportConfirmation', () => {
  it('显示地图摘要、清理影响和偏好保留说明', async () => {
    const { host } = await mountConfirmation()

    expect(host.textContent).toContain('即将替换当前地图')
    expect(host.textContent).toContain('41 × 41')
    expect(host.textContent).toContain('880')
    expect(host.textContent).toContain('(1, 0)')
    expect(host.textContent).toContain('(39, 40)')
    expect(host.textContent).toContain('四方向')
    expect(host.textContent).toContain('清除旧路径和搜索回放')
    expect(host.textContent).toContain('保留当前算法选择')
    expect(host.textContent).toContain('保留搜索回放倍速')
  })

  it('返回预览和确认替换使用行内事件，不调用 window.confirm', async () => {
    const nativeConfirm = vi.fn()
    vi.stubGlobal('confirm', nativeConfirm)
    const { onCancel, onConfirm } = await mountConfirmation()
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
    buttons.find((button) => button.textContent?.includes('返回预览'))?.click()
    buttons.find((button) => button.textContent?.includes('确认替换地图'))?.click()
    await nextTick()

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(nativeConfirm).not.toHaveBeenCalled()
  })

  it('应用期间显示正在导入并禁用两个操作', async () => {
    await mountConfirmation(true)
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]

    expect(document.body.textContent).toContain('正在导入地图…')
    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.disabled)).toBe(true)
  })
})
