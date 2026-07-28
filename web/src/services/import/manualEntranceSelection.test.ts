import { describe, expect, it } from 'vitest'
import type { EntranceSelectionSummary } from '@/types/mazeImportWorker'
import { createEntranceSelectionSummaryFixture } from './testUtils/mazeImportWorkerFixtures'
import {
  swapManualEntranceSelection,
  validateManualEntranceSelection,
} from './manualEntranceSelection'

const selection = {
  startCandidateId: 'top:0-0',
  goalCandidateId: 'bottom:4-4',
}

describe('manualEntranceSelection', () => {
  it('接受来自当前候选列表、存在且同分量连通的入口对', () => {
    const summary = createEntranceSelectionSummaryFixture()
    expect(validateManualEntranceSelection(selection, summary))
      .toMatchObject({
        valid: true,
        sameCandidate: false,
        connected: true,
        pairExists: true,
        startCandidateExists: true,
        goalCandidateExists: true,
        warnings: [],
      })
  })

  it('拒绝缺失、同一候选和已失效的候选引用', () => {
    const summary = createEntranceSelectionSummaryFixture()
    expect(validateManualEntranceSelection({
      startCandidateId: null,
      goalCandidateId: null,
    }, summary).warnings).toEqual([
      '请选择起点入口。',
      '请选择终点入口。',
    ])
    expect(validateManualEntranceSelection({
      startCandidateId: 'top:0-0',
      goalCandidateId: 'top:0-0',
    }, summary)).toMatchObject({
      valid: false,
      sameCandidate: true,
    })
    expect(validateManualEntranceSelection({
      startCandidateId: 'stale',
      goalCandidateId: 'bottom:4-4',
    }, summary)).toMatchObject({
      valid: false,
      startCandidateExists: false,
    })
  })

  it('拒绝不存在、断开或跨分量的候选对', () => {
    const summary = createEntranceSelectionSummaryFixture()
    const withoutPair: EntranceSelectionSummary = {
      ...summary,
      pairCandidates: summary.pairCandidates.slice(1),
    }
    expect(validateManualEntranceSelection(selection, withoutPair))
      .toMatchObject({ valid: false, pairExists: false })

    const disconnected: EntranceSelectionSummary = {
      ...summary,
      candidates: summary.candidates.map((candidate) =>
        candidate.id === selection.goalCandidateId
          ? { ...candidate, componentId: 2 }
          : candidate),
      pairCandidates: summary.pairCandidates.map((pair) =>
        pair.firstCandidateId === selection.startCandidateId &&
        pair.secondCandidateId === selection.goalCandidateId
          ? { ...pair, connected: false, sameComponent: false }
          : pair),
    }
    const validation = validateManualEntranceSelection(
      selection,
      disconnected,
    )
    expect(validation).toMatchObject({
      valid: false,
      pairExists: true,
      connected: false,
    })
    expect(validation.warnings[0]).toContain('不在同一连通区域')
  })

  it('拒绝 invalid 候选且不修改输入，并以新对象交换角色', () => {
    const summary = createEntranceSelectionSummaryFixture()
    summary.candidates[0] = {
      ...summary.candidates[0]!,
      state: 'invalid',
    }
    const snapshot = structuredClone(summary)
    expect(validateManualEntranceSelection(selection, summary).warnings)
      .toContain('无效候选不能作为起点。')
    expect(summary).toEqual(snapshot)

    const swapped = swapManualEntranceSelection(selection)
    expect(swapped).toEqual({
      startCandidateId: selection.goalCandidateId,
      goalCandidateId: selection.startCandidateId,
    })
    expect(swapped).not.toBe(selection)
  })
})
