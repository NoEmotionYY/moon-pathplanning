export type SparseGridWorldErrorCode =
  | 'SPARSE_WORLD_ENDPOINT_CONFLICT'
  | 'SPARSE_WORLD_ENDPOINT_BLOCKED'
  | 'SPARSE_WORLD_TERRAIN_COST_INVALID'
  | 'SPARSE_WORLD_TERRAIN_ON_BLOCKED'
  | 'SPARSE_WORLD_TERRAIN_ON_ENDPOINT'
  | 'SPARSE_WORLD_OBSTACLE_ON_ENDPOINT'
  | 'SPARSE_WORLD_PATCH_INVALID'

const messages: Record<SparseGridWorldErrorCode, string> = {
  SPARSE_WORLD_ENDPOINT_CONFLICT: '起点与终点不能相同',
  SPARSE_WORLD_ENDPOINT_BLOCKED: '起点或终点不能位于障碍物上',
  SPARSE_WORLD_TERRAIN_COST_INVALID: '地形代价必须是有限正整数',
  SPARSE_WORLD_TERRAIN_ON_BLOCKED: '障碍物单元不能设置地形代价',
  SPARSE_WORLD_TERRAIN_ON_ENDPOINT: '起点或终点不能设置非默认地形',
  SPARSE_WORLD_OBSTACLE_ON_ENDPOINT: '起点或终点不能设置为障碍物',
  SPARSE_WORLD_PATCH_INVALID: '稀疏世界批量更新无效',
}

export class SparseGridWorldError extends Error {
  readonly code: SparseGridWorldErrorCode

  constructor(code: SparseGridWorldErrorCode, message = messages[code]) {
    super(message)
    this.name = 'SparseGridWorldError'
    this.code = code
  }

  toJSON(): { code: SparseGridWorldErrorCode; message: string } {
    return { code: this.code, message: this.message }
  }
}

export const sparseWorldError = (code: SparseGridWorldErrorCode): SparseGridWorldError =>
  new SparseGridWorldError(code)
