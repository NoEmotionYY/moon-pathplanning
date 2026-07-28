import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorkerResultFixture } from '@/services/import/testUtils/mazeImportWorkerFixtures'
import MazeAnalysisResult from './MazeAnalysisResult.vue'

let app: ReturnType<typeof createApp> | null = null
afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const mountResult = (
  status: 'success' | 'manual-input-required' | 'unsupported-topology' | 'failed',
) => {
  const host = document.createElement('div')
  document.body.append(host)
  const result = createWorkerResultFixture(status)
  app = createApp(MazeAnalysisResult, {
    status,
    result,
    error: status === 'failed'
      ? { code: 'VISIBLE_CODE', message: '结构化中文错误。' }
      : null,
  })
  app.mount(host)
  return host
}

describe('MazeAnalysisResult', () => {
  it('success 显示成功摘要但不宣称已导入', () => {
    const host = mountResult('success')
    expect(host.textContent).toContain('迷宫识别成功')
    expect(host.textContent).toContain('当前地图尚未被修改')
    expect(host.textContent).not.toContain('已导入地图')
  })

  it('manual 和 unsupported 使用专属说明而非普通失败', () => {
    const manual = mountResult('manual-input-required')
    expect(manual.textContent).toContain('需要确认迷宫入口')
    expect(manual.textContent).toContain('入口手动选择将在下一阶段开放')
    app?.unmount()
    const unsupported = mountResult('unsupported-topology')
    expect(unsupported.textContent).toContain(
      '当前图片未被可靠识别为正交矩形迷宫',
    )
    expect(unsupported.textContent).not.toContain('六边形')
  })

  it('failed 只显示结构化错误，不暴露堆栈', () => {
    const host = mountResult('failed')
    expect(host.textContent).toContain('结构化中文错误。')
    expect(host.textContent).toContain('VISIBLE_CODE')
    expect(host.textContent).not.toContain('Error:')
    expect(host.textContent).not.toContain('at ')
  })
})
