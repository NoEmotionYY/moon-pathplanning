import type {
  MazeCell,
  OuterBoundarySegment,
  OuterBoundarySide,
} from './mazeTopology'

export type EntranceCandidateState =
  | 'reliable'
  | 'uncertain'
  | 'invalid'

export type EntranceSelectionStatus =
  | 'selected'
  | 'none'
  | 'single'
  | 'ambiguous'
  | 'disconnected'
  | 'low-confidence'
  | 'topology-unavailable'

export interface EntranceCandidate {
  id: string
  side: OuterBoundarySide
  segments: OuterBoundarySegment[]
  startIndex: number
  endIndex: number
  widthInCells: number
  representativeCell: MazeCell
  interiorCell: MazeCell
  centerPixel: {
    x: number
    y: number
  }
  averageWallScore: number
  minimumSegmentConfidence: number
  confidence: number
  componentId: number | null
  componentSize: number
  state: EntranceCandidateState
  warnings: string[]
}

export interface EntrancePairCandidate {
  first: EntranceCandidate
  second: EntranceCandidate
  connected: boolean
  sameComponent: boolean
  graphDistance: number | null
  boundaryDistance: number
  confidence: number
  warnings: string[]
}

export interface EntranceSelectionResult {
  status: EntranceSelectionStatus
  candidates: EntranceCandidate[]
  pairCandidates: EntrancePairCandidate[]
  selectedPair: EntrancePairCandidate | null
  automatic: boolean
  confidence: number
  warnings: string[]
}
