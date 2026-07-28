import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { EntranceSelectionSummary } from '@/types/mazeImportWorker'
import EntranceCandidateList from './EntranceCandidateList.vue'

let app: ReturnType<typeof createApp> | null = null
afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

const candidate = (
  id: string,
  startIndex: number,
  endIndex: number,
) => ({
  id,
  side: 'top' as const,
  startIndex,
  endIndex,
  widthInCells: endIndex - startIndex + 1,
  representativeCell: { row: 0, column: startIndex },
  confidence: 0.9,
  state: 'reliable' as const,
  componentId: 0,
  componentSize: 80,
  warnings: [],
})

const mountList = (selection: EntranceSelectionSummary) => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(EntranceCandidateList, { selection })
  app.mount(host)
  return host
}

const selection = (
  candidates: EntranceSelectionSummary['candidates'],
): EntranceSelectionSummary => ({
  status: 'selected',
  automatic: true,
  confidence: 0.9,
  candidateCount: candidates.length,
  pairCandidateCount: 1,
  selectedCandidateIds:
    candidates.length >= 2 ? [candidates[0]!.id, candidates[1]!.id] : null,
  candidates,
  warnings: [],
})

describe('EntranceCandidateList', () => {
  it('双入口和三入口全部显示，并标记自动 first/second', () => {
    const host = mountList(selection([
      candidate('first', 0, 0),
      candidate('second', 7, 7),
      candidate('third', 4, 4),
    ]))
    expect(host.querySelectorAll('li')).toHaveLength(3)
    expect(host.textContent).toContain('自动起点')
    expect(host.textContent).toContain('自动终点')
    expect(host.textContent).toContain('third')
  })

  it('宽入口作为一个候选并显示连续范围，列表不可点击', () => {
    const host = mountList(selection([candidate('wide', 2, 3)]))
    expect(host.querySelectorAll('li')).toHaveLength(1)
    expect(host.textContent).toContain('第 3～4 格')
    expect(host.textContent).toContain('宽 2 格')
    expect(host.querySelector('button')).toBeNull()
  })
})
