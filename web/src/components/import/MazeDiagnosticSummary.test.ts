import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { MazeImportDiagnosticSummary } from '@/types/mazeImportPipeline'
import MazeDiagnosticSummary from './MazeDiagnosticSummary.vue'

let app: ReturnType<typeof createApp> | null = null

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const mountSummary = (
  overrides: Partial<MazeImportDiagnosticSummary> = {},
) => {
  const diagnostics: MazeImportDiagnosticSummary = {
    sourceWidth: 8,
    sourceHeight: 10,
    transformedWidth: 10,
    transformedHeight: 8,
    croppedWidth: null,
    croppedHeight: null,
    detectedRows: 8,
    detectedColumns: 10,
    orthogonalConfidence: 0.9234,
    topologyConfidence: 0.881,
    entranceStatus: 'selected',
    entranceCandidateCount: 2,
    pairCandidateCount: 1,
    convertedWidth: 21,
    convertedHeight: 17,
    obstacleCount: 196,
    walkableCount: 161,
    ...overrides,
  }
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(MazeDiagnosticSummary, { diagnostics })
  app.mount(host)
  return host
}

describe('MazeDiagnosticSummary', () => {
  it('按 columns 列 × rows 行和 width × height 显示尺寸', () => {
    const host = mountSummary()
    expect(host.textContent).toContain('10 列 × 8 行')
    expect(host.textContent).toContain('21 × 17')
    expect(host.textContent).toContain('196')
    expect(host.textContent).toContain('161')
  })

  it('置信度限制为百分比一位小数，null 显示破折号', () => {
    const host = mountSummary({
      orthogonalConfidence: 1.5,
      topologyConfidence: -0.4,
      croppedWidth: null,
      croppedHeight: null,
    })
    expect(host.textContent).toContain('100.0%')
    expect(host.textContent).toContain('0.0%')
    expect(host.textContent).toContain('—')
  })
})
