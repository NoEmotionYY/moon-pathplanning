import type { GridMapDocument } from './grid'
import type {
  EntranceCandidate,
} from './mazeEntrances'
import type { MazeCell } from './mazeTopology'

export interface GridCoordinate {
  x: number
  y: number
}

export interface MazeCellGridMapping {
  cell: MazeCell
  grid: GridCoordinate
}

export interface EntranceGridMapping {
  candidateId: string
  boundaryPoint: GridCoordinate
  interiorPoint: GridCoordinate
  openedBoundaryPoints: GridCoordinate[]
  sourceCandidate: EntranceCandidate
}

export interface OrthogonalGridConversionMetrics {
  rows: number
  columns: number
  gridWidth: number
  gridHeight: number
  totalGridCells: number
  obstacleCells: number
  walkableCells: number
  logicalCellCenters: number
  openPassageCells: number
  openedOuterBoundaryCells: number
  expectedWalkableCells: number
}

export interface OrthogonalGridConversionResult {
  success: boolean
  document: GridMapDocument | null
  startSource: EntranceCandidate | null
  goalSource: EntranceCandidate | null
  startMapping: EntranceGridMapping | null
  goalMapping: EntranceGridMapping | null
  cellMappings: MazeCellGridMapping[]
  metrics: OrthogonalGridConversionMetrics | null
  warnings: string[]
  error?: {
    code: string
    message: string
  }
}
