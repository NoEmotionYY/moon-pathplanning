import { createApp } from 'vue'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManualEntranceSelection } from '@/types/mazeImportSelection'
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

const mountList = (
  selection: EntranceSelectionSummary,
  options: {
    mode?: 'readonly' | 'select'
    manualSelection?: ManualEntranceSelection
    onSelect?: (role: 'start' | 'goal', candidateId: string) => void
  } = {},
) => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(EntranceCandidateList, { selection, ...options })
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
  pairCandidates: candidates.length >= 2
    ? [{
        firstCandidateId: candidates[0]!.id,
        secondCandidateId: candidates[1]!.id,
        connected: true,
        sameComponent: true,
        graphDistance: 12,
        boundaryDistance: 80,
        confidence: 0.9,
        warnings: [],
      }]
    : [],
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
    expect(host.querySelector('input')).toBeNull()
  })

  it('选择模式为起点和终点使用独立 radio 组并发出明确角色', async () => {
    const onSelect = vi.fn()
    const current = selection([
      candidate('first', 0, 0),
      candidate('second', 7, 7),
    ])
    const host = mountList(current, {
      mode: 'select',
      manualSelection: {
        startCandidateId: 'first',
        goalCandidateId: null,
      },
      onSelect,
    })
    const radios = host.querySelectorAll<HTMLInputElement>('input[type=radio]')
    expect(radios).toHaveLength(4)
    expect(radios[0]?.name).not.toBe(radios[1]?.name)
    expect(radios[0]?.name).toBe(radios[2]?.name)
    expect(radios[1]?.name).toBe(radios[3]?.name)
    expect(radios[0]?.checked).toBe(true)
    radios[3]?.click()
    await nextTick()
    expect(onSelect).toHaveBeenCalledWith('goal', 'second')
  })

  it('无效候选仍可查看但不能通过键盘或鼠标选为角色', () => {
    const invalid = {
      ...candidate('invalid', 1, 1),
      state: 'invalid' as const,
    }
    const host = mountList(selection([
      candidate('first', 0, 0),
      invalid,
    ]), {
      mode: 'select',
      manualSelection: {
        startCandidateId: null,
        goalCandidateId: null,
      },
    })
    const disabled = host.querySelectorAll<HTMLInputElement>(
      'li:last-child input',
    )
    expect(disabled).toHaveLength(2)
    expect([...disabled].every((input) => input.disabled)).toBe(true)
    expect(host.textContent).toContain('无效')
  })
})
