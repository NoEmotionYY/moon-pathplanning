import type { GridMapDocument } from './grid'
import type {
  MapImportCapability,
  MapImportTransactionError,
} from './mapImportTransaction'

export type MazeImportApplicationStatus =
  | 'idle'
  | 'confirming'
  | 'applying'
  | 'success'
  | 'failed'
  | 'stale'
  | 'size-blocked'
  | 'busy'

export interface MazeImportApplicationState {
  status: MazeImportApplicationStatus
  error: MapImportTransactionError | null
  warnings: string[]
}

export interface MazeImportConfirmationSummary {
  width: number
  height: number
  obstacleCount: number
  terrainCount: number
  start: GridMapDocument['start']
  goal: GridMapDocument['goal']
  movement: GridMapDocument['movement']
  previousMapVersion: number
}

export interface MazeImportApplicationContext {
  document: GridMapDocument | null
  capability: MapImportCapability | null
}
