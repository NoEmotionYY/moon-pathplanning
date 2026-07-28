import { createApp, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProgressFixture } from '@/services/import/testUtils/mazeImportWorkerFixtures'
import MazeAnalysisProgress from './MazeAnalysisProgress.vue'

const mounted: Array<ReturnType<typeof createApp>> = []

const mountProgress = (progress = createProgressFixture(0.42)) => {
  const host = document.createElement('div')
  document.body.append(host)
  const onCancel = vi.fn()
  const app = createApp(MazeAnalysisProgress, {
    progress,
    onCancel,
  })
  mounted.push(app)
  app.mount(host)
  return { host, onCancel }
}

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.replaceChildren()
})

describe('MazeAnalysisProgress', () => {
  it('显示中文阶段、百分比和原生进度值', () => {
    const { host } = mountProgress()
    expect(host.textContent).toContain('提取墙体结构')
    expect(host.textContent).toContain('42%')
    expect(host.querySelector('progress')?.value).toBe(42)
    expect(host.querySelector('[aria-live="polite"]')).not.toBeNull()
  })

  it('进度不会倒退，取消按钮发出硬取消事件', async () => {
    const progress = createProgressFixture(0.8)
    const { host, onCancel } = mountProgress(progress)
    progress.progress = 0.2
    await nextTick()
    expect(host.querySelector('progress')?.value).toBe(80)
    const button = host.querySelector('button')
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
