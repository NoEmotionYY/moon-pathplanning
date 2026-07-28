export type SparseGridDocumentErrorCode =
  | 'SPARSE_MAP_FILE_TYPE_UNSUPPORTED'
  | 'SPARSE_MAP_FILE_TOO_LARGE'
  | 'SPARSE_MAP_FILE_READ_FAILED'
  | 'SPARSE_MAP_JSON_INVALID'
  | 'SPARSE_MAP_FORMAT_UNSUPPORTED'
  | 'SPARSE_MAP_DEFAULT_TERRAIN_UNSUPPORTED'
  | 'SPARSE_MAP_COORDINATE_INVALID'
  | 'SPARSE_MAP_ENDPOINT_CONFLICT'
  | 'SPARSE_MAP_ENDPOINT_BLOCKED'
  | 'SPARSE_MAP_ENDPOINT_TERRAIN_CONFLICT'
  | 'SPARSE_MAP_DUPLICATE_OBSTACLE'
  | 'SPARSE_MAP_DUPLICATE_TERRAIN'
  | 'SPARSE_MAP_CELL_CONFLICT'
  | 'SPARSE_MAP_TERRAIN_COST_INVALID'
  | 'SPARSE_MAP_TOO_MANY_OBSTACLES'
  | 'SPARSE_MAP_TOO_MANY_TERRAIN_CELLS'
  | 'SPARSE_MAP_TOO_MANY_NON_DEFAULT_CELLS'
  | 'SPARSE_MAP_VIEWPORT_HINT_INVALID'
  | 'SPARSE_MAP_PLANNING_HINT_INVALID'

const messages: Record<SparseGridDocumentErrorCode, string> = {
  SPARSE_MAP_FILE_TYPE_UNSUPPORTED: '不支持的稀疏地图文件类型',
  SPARSE_MAP_FILE_TOO_LARGE: '稀疏地图文件超过大小限制',
  SPARSE_MAP_FILE_READ_FAILED: '稀疏地图文件读取失败',
  SPARSE_MAP_JSON_INVALID: '稀疏地图 JSON 无效',
  SPARSE_MAP_FORMAT_UNSUPPORTED: '不支持的稀疏地图格式',
  SPARSE_MAP_DEFAULT_TERRAIN_UNSUPPORTED: '仅支持默认地形代价 1',
  SPARSE_MAP_COORDINATE_INVALID: '稀疏地图坐标无效',
  SPARSE_MAP_ENDPOINT_CONFLICT: '起点与终点不能相同',
  SPARSE_MAP_ENDPOINT_BLOCKED: '起点或终点不能是障碍物',
  SPARSE_MAP_ENDPOINT_TERRAIN_CONFLICT: '起点或终点不能有非默认地形',
  SPARSE_MAP_DUPLICATE_OBSTACLE: '障碍物坐标重复',
  SPARSE_MAP_DUPLICATE_TERRAIN: '地形坐标重复',
  SPARSE_MAP_CELL_CONFLICT: '同一单元不能同时是障碍物和地形',
  SPARSE_MAP_TERRAIN_COST_INVALID: '地形代价必须是大于 1 的有限整数',
  SPARSE_MAP_TOO_MANY_OBSTACLES: '障碍物数量超过限制',
  SPARSE_MAP_TOO_MANY_TERRAIN_CELLS: '地形单元数量超过限制',
  SPARSE_MAP_TOO_MANY_NON_DEFAULT_CELLS: '非默认单元总数超过限制',
  SPARSE_MAP_VIEWPORT_HINT_INVALID: '初始视口提示无效',
  SPARSE_MAP_PLANNING_HINT_INVALID: '规划提示无效',
}

export class SparseGridDocumentError extends Error {
  readonly code: SparseGridDocumentErrorCode
  readonly details?: Readonly<Record<string, unknown>>

  constructor(
    code: SparseGridDocumentErrorCode,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(messages[code])
    this.name = 'SparseGridDocumentError'
    this.code = code
    this.details = details
  }

  toJSON(): {
    code: SparseGridDocumentErrorCode
    message: string
    details?: Readonly<Record<string, unknown>>
  } {
    return this.details
      ? { code: this.code, message: this.message, details: this.details }
      : { code: this.code, message: this.message }
  }
}

export const sparseDocumentError = (
  code: SparseGridDocumentErrorCode,
  details?: Readonly<Record<string, unknown>>,
): SparseGridDocumentError => new SparseGridDocumentError(code, details)
