export type EntranceRole = 'start' | 'goal'
export type EntranceSelectionSource = 'automatic' | 'manual' | null

export interface ManualEntranceSelection {
  startCandidateId: string | null
  goalCandidateId: string | null
}

export interface ManualEntranceSelectionValidation {
  valid: boolean
  sameCandidate: boolean
  connected: boolean
  pairExists: boolean
  startCandidateExists: boolean
  goalCandidateExists: boolean
  warnings: string[]
}
