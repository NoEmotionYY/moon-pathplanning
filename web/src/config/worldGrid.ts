export const WORLD_CHUNK_SIZE = 32

// Development-time guards. These are deliberately smaller than JavaScript's
// safe-integer limits so accidental unbounded world operations fail early.
export const WORLD_COORDINATE_MIN = -1_000_000_000
export const WORLD_COORDINATE_MAX = 1_000_000_000
export const WORLD_BOUNDARY_MIN = WORLD_COORDINATE_MIN
export const WORLD_BOUNDARY_MAX_EXCLUSIVE = WORLD_COORDINATE_MAX + 1
export const WORLD_BOUNDS_MAX_SPAN =
  WORLD_BOUNDARY_MAX_EXCLUSIVE - WORLD_BOUNDARY_MIN
