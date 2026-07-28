export type WorldGridErrorCode =
  | 'WORLD_COORDINATE_NOT_INTEGER'
  | 'WORLD_COORDINATE_OUT_OF_RANGE'
  | 'WORLD_BOUNDS_INVALID'
  | 'WORLD_BOUNDS_TOO_LARGE'
  | 'CHUNK_COORDINATE_INVALID'
  | 'CHUNK_LOCAL_COORDINATE_INVALID'
  | 'PLANNING_POINT_OUT_OF_BOUNDS'

const messages: Record<WorldGridErrorCode, string> = {
  WORLD_COORDINATE_NOT_INTEGER: '世界坐标必须是有限整数',
  WORLD_COORDINATE_OUT_OF_RANGE: '世界坐标超出允许范围',
  WORLD_BOUNDS_INVALID: '世界边界无效',
  WORLD_BOUNDS_TOO_LARGE: '世界边界尺寸过大',
  CHUNK_COORDINATE_INVALID: 'Chunk 坐标无效',
  CHUNK_LOCAL_COORDINATE_INVALID: 'Chunk 局部坐标无效',
  PLANNING_POINT_OUT_OF_BOUNDS: '规划坐标超出窗口边界',
}

export class WorldGridError extends Error {
  readonly code: WorldGridErrorCode

  constructor(code: WorldGridErrorCode) {
    super(messages[code])
    this.name = 'WorldGridError'
    this.code = code
  }

  toJSON(): { code: WorldGridErrorCode; message: string } {
    return { code: this.code, message: this.message }
  }
}

export const createWorldGridError = (code: WorldGridErrorCode): WorldGridError =>
  new WorldGridError(code)

