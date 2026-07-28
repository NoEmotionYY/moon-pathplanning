import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { MazeImportPipelineWarning } from '@/types/mazeImportPipeline'
import MazeAnalysisWarnings from './MazeAnalysisWarnings.vue'

let app: ReturnType<typeof createApp> | null = null

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const mountWarnings = (warnings: MazeImportPipelineWarning[]) => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(MazeAnalysisWarnings, { warnings })
  app.mount(host)
  return host
}

describe('MazeAnalysisWarnings', () => {
  it('按流水线顺序显示中文消息并去除完全重复项', () => {
    const repeated: MazeImportPipelineWarning = {
      stage: 'preprocess',
      code: 'NOISE',
      message: '检测到少量噪点。',
    }
    const host = mountWarnings([
      {
        stage: 'entrance-selection',
        code: 'ENTRANCE',
        message: '入口需要确认。',
      },
      repeated,
      { ...repeated },
    ])
    expect(host.textContent?.match(/检测到少量噪点。/g)).toHaveLength(1)
    expect(host.textContent?.indexOf('墙体结构')).toBeLessThan(
      host.textContent?.indexOf('入口检测') ?? 0,
    )
    expect(host.textContent).toContain('NOISE')
  })

  it('大量警告默认折叠且不会触发 Toast', () => {
    const host = mountWarnings(
      Array.from({ length: 5 }, (_, index) => ({
        stage: 'preprocess' as const,
        code: `WARNING_${index}`,
        message: `警告 ${index}`,
      })),
    )
    expect(host.querySelector('details')?.open).toBe(false)
    expect(host.textContent).toContain('5')
  })
})
