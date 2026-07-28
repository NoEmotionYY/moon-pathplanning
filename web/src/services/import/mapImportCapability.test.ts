import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import type { GridMapDocument } from '@/types/grid'
import {
  FORMAL_MAP_IMPORT_MAX_SIZE,
  getMapImportCapability,
} from './mapImportCapability'

const document = (width: number, height: number): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width,
  height,
  start: [0, 0],
  goal: [width - 1, height - 1],
  movement: 'four_way',
  obstacles: [],
  terrain: [],
})

describe('mapImportCapability', () => {
  it('以主编辑器已验证的 60×60 能力作为正式导入上限', () => {
    expect(FORMAL_MAP_IMPORT_MAX_SIZE).toBe(MAP_SIZE_LIMITS.recommendedMax)
    expect(getMapImportCapability(document(60, 60)).allowed).toBe(true)
  })

  it.each([
    [61, 60],
    [60, 61],
    [151, 151],
  ])('拒绝只能预览的 %i×%i 地图', (width, height) => {
    const capability = getMapImportCapability(document(width, height))
    expect(capability.allowed).toBe(false)
    expect(capability.supportsLargeGridRendering).toBe(false)
    expect(capability.error?.code).toBe('MAP_IMPORT_RENDER_LIMIT_EXCEEDED')
  })
})
