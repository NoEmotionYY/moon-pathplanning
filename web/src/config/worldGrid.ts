export const WORLD_CHUNK_SIZE = 32

// Development-time guards. These are deliberately smaller than JavaScript's
// safe-integer limits so accidental unbounded world operations fail early.
export const WORLD_COORDINATE_MIN = -1_000_000_000
export const WORLD_COORDINATE_MAX = 1_000_000_000
export const WORLD_BOUNDARY_MIN = WORLD_COORDINATE_MIN
export const WORLD_BOUNDARY_MAX_EXCLUSIVE = WORLD_COORDINATE_MAX + 1
export const WORLD_BOUNDS_MAX_SPAN =
  WORLD_BOUNDARY_MAX_EXCLUSIVE - WORLD_BOUNDARY_MIN

export const WORLD_CHUNK_CELL_COUNT = WORLD_CHUNK_SIZE * WORLD_CHUNK_SIZE
export const WORLD_CHUNK_BITSET_WORD_COUNT = Math.ceil(WORLD_CHUNK_CELL_COUNT / 32)
export const DEFAULT_WORLD_TERRAIN_COST = 1

export const SPARSE_MAP_IMPORT_LIMITS = {
  maximumBytes: 16 * 1024 * 1024,
  maximumObstacleCount: 250_000,
  maximumTerrainCount: 250_000,
  maximumNonDefaultCellCount: 300_000,
} as const

export const SPARSE_MAP_PLANNING_HINT_LIMITS = {
  maximumMargin: 4096,
  maximumExpandedNodes: 2_000_000,
  minimumTimeoutMs: 100,
  maximumTimeoutMs: 120_000,
} as const
