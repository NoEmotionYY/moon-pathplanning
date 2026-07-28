import type { MovementMode } from './grid'
import type { WorldBounds, WorldPointTuple } from './worldGrid'

export interface SparseGridTerrainCell {
  readonly point: WorldPointTuple
  readonly cost: number
}

export interface SparseGridPlanningHint {
  readonly margin?: number
  readonly maxExpandedNodes?: number
  readonly timeoutMs?: number
  readonly tracePolicy?: 'full' | 'limited' | 'disabled'
}

export interface SparseGridDocument {
  readonly format: 'moon-pathplanning.sparse-grid.v1'
  readonly start: WorldPointTuple
  readonly goal: WorldPointTuple
  readonly movement: MovementMode
  readonly defaultTerrainCost: 1
  readonly obstacles: readonly WorldPointTuple[]
  readonly terrain: readonly SparseGridTerrainCell[]
  readonly viewportHint?: WorldBounds
  readonly planningHint?: SparseGridPlanningHint
}
