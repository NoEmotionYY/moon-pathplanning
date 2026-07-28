import type {
  ManualEntranceSelection,
  ManualEntranceSelectionValidation,
} from '@/types/mazeImportSelection'
import type { EntranceSelectionSummary } from '@/types/mazeImportWorker'

const includesPair = (
  firstCandidateId: string,
  secondCandidateId: string,
  pair: EntranceSelectionSummary['pairCandidates'][number],
): boolean =>
  (pair.firstCandidateId === firstCandidateId &&
    pair.secondCandidateId === secondCandidateId) ||
  (pair.firstCandidateId === secondCandidateId &&
    pair.secondCandidateId === firstCandidateId)

export function validateManualEntranceSelection(
  selection: ManualEntranceSelection,
  summary: EntranceSelectionSummary,
): ManualEntranceSelectionValidation {
  const start = summary.candidates.find(
    (candidate) => candidate.id === selection.startCandidateId,
  )
  const goal = summary.candidates.find(
    (candidate) => candidate.id === selection.goalCandidateId,
  )
  const startCandidateExists = start !== undefined
  const goalCandidateExists = goal !== undefined
  const sameCandidate =
    selection.startCandidateId !== null &&
    selection.startCandidateId === selection.goalCandidateId
  const pair =
    start && goal && !sameCandidate
      ? summary.pairCandidates.find((candidatePair) =>
          includesPair(start.id, goal.id, candidatePair))
      : undefined
  const pairExists = pair !== undefined
  const connected =
    pair?.connected === true &&
    pair.sameComponent === true &&
    start?.componentId !== null &&
    start?.componentId === goal?.componentId
  const warnings: string[] = []

  if (!selection.startCandidateId) warnings.push('请选择起点入口。')
  else if (!startCandidateExists) warnings.push('所选起点已不在当前候选列表中。')
  else if (start.state === 'invalid') warnings.push('无效候选不能作为起点。')

  if (!selection.goalCandidateId) warnings.push('请选择终点入口。')
  else if (!goalCandidateExists) warnings.push('所选终点已不在当前候选列表中。')
  else if (goal.state === 'invalid') warnings.push('无效候选不能作为终点。')

  if (sameCandidate) warnings.push('起点和终点不能使用同一个候选。')
  else if (start && goal && !pairExists) {
    warnings.push('所选入口组合不在当前候选对分析结果中。')
  } else if (pairExists && !connected) {
    warnings.push('所选入口不在同一连通区域，不能应用。')
  }

  return {
    valid:
      warnings.length === 0 &&
      startCandidateExists &&
      goalCandidateExists &&
      pairExists &&
      connected,
    sameCandidate,
    connected,
    pairExists,
    startCandidateExists,
    goalCandidateExists,
    warnings,
  }
}

export function swapManualEntranceSelection(
  selection: ManualEntranceSelection,
): ManualEntranceSelection {
  return {
    startCandidateId: selection.goalCandidateId,
    goalCandidateId: selection.startCandidateId,
  }
}
