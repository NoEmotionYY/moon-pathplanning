export type PointTuple = [number, number]

export interface Point {
  x: number
  y: number
}

export type MovementMode = 'four_way' | 'eight_way'
export type GridTool = 'obstacle' | 'erase' | 'start' | 'goal' | 'terrain'
export type TerrainCost = 1 | 2 | 4 | 8

export interface TerrainCell {
  point: PointTuple
  cost: number
}

export interface GridMapDocument {
  format: 'moon-pathplanning.grid.v1'
  width: number
  height: number
  start: PointTuple
  goal: PointTuple
  movement: MovementMode
  obstacles: PointTuple[]
  terrain: TerrainCell[]
}
