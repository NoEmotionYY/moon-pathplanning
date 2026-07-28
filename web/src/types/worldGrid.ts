export interface WorldPoint {
  readonly x: number
  readonly y: number
}

export type WorldPointTuple = readonly [number, number]

/** Half-open bounds: [minX, maxX) × [minY, maxY). */
export interface WorldBounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface ChunkCoordinate {
  readonly chunkX: number
  readonly chunkY: number
}

export interface ChunkLocalCoordinate {
  readonly localX: number
  readonly localY: number
}

export interface WorldCellAddress {
  readonly chunk: ChunkCoordinate
  readonly local: ChunkLocalCoordinate
}

export interface GridViewportTransform {
  readonly worldOrigin: WorldPoint
  readonly viewportOffsetX: number
  readonly viewportOffsetY: number
  readonly cellSize: number
  readonly scale: number
}

export interface PlanningPoint {
  readonly x: number
  readonly y: number
}

export interface PlanningWindow {
  readonly bounds: WorldBounds
  readonly width: number
  readonly height: number
}

export interface PlanningCoordinateTransform extends PlanningWindow {
  readonly worldOrigin: WorldPoint
}

