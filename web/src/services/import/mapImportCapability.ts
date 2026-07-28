import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import type { GridMapDocument } from '@/types/grid'
import type { MapImportCapability } from '@/types/mapImportTransaction'

export const FORMAL_MAP_IMPORT_MAX_SIZE =
  MAP_SIZE_LIMITS.recommendedMax

const LARGE_GRID_REASON =
  '主地图编辑器当前逐格渲染 DOM，尚未验证超过 60×60 的交互与规划安全性。'

export function getMapImportCapability(
  document: GridMapDocument,
): MapImportCapability {
  const exceedsFormalLimit =
    document.width > FORMAL_MAP_IMPORT_MAX_SIZE ||
    document.height > FORMAL_MAP_IMPORT_MAX_SIZE
  if (exceedsFormalLimit) {
    return {
      allowed: false,
      maximumImportWidth: FORMAL_MAP_IMPORT_MAX_SIZE,
      maximumImportHeight: FORMAL_MAP_IMPORT_MAX_SIZE,
      supportsLargeGridRendering: false,
      reason: LARGE_GRID_REASON,
      warnings: [],
      error: {
        code: 'MAP_IMPORT_RENDER_LIMIT_EXCEEDED',
        message:
          '识别结果超过当前地图编辑器可安全导入的尺寸上限，但仍可查看分析预览。',
      },
    }
  }
  return {
    allowed: true,
    maximumImportWidth: FORMAL_MAP_IMPORT_MAX_SIZE,
    maximumImportHeight: FORMAL_MAP_IMPORT_MAX_SIZE,
    supportsLargeGridRendering: false,
    reason: LARGE_GRID_REASON,
    warnings: [],
  }
}
