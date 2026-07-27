import type { GridMapDocument, PointTuple } from '@/types/grid'
import { IMPORT_FILE_SIZE_LIMITS } from '@/config/importLimits'
import { MAP_SIZE_LIMITS } from '@/config/mapLimits'

export const MAX_IMPORT_BYTES = IMPORT_FILE_SIZE_LIMITS.json

const isIntegerTuple = (value: unknown): value is PointTuple =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((part) => Number.isInteger(part))

const inBounds = ([x, y]: PointTuple, width: number, height: number) =>
  x >= 0 && y >= 0 && x < width && y < height

export function validateGridDocument(value: unknown): asserts value is GridMapDocument {
  if (!value || typeof value !== 'object') throw new Error('地图根节点必须是对象')
  const map = value as Record<string, unknown>
  if (map.format !== 'moon-pathplanning.grid.v1') throw new Error('不支持的地图格式')
  if (
    !Number.isInteger(map.width) ||
    !Number.isInteger(map.height) ||
    Number(map.width) < MAP_SIZE_LIMITS.min ||
    Number(map.height) < MAP_SIZE_LIMITS.min ||
    Number(map.width) > MAP_SIZE_LIMITS.recommendedMax ||
    Number(map.height) > MAP_SIZE_LIMITS.recommendedMax
  ) {
    throw new Error(
      `地图尺寸必须在 ${MAP_SIZE_LIMITS.min}×${MAP_SIZE_LIMITS.min} 到 ` +
      `${MAP_SIZE_LIMITS.recommendedMax}×${MAP_SIZE_LIMITS.recommendedMax} 之间`,
    )
  }
  const width = Number(map.width)
  const height = Number(map.height)
  if (!isIntegerTuple(map.start) || !inBounds(map.start, width, height)) {
    throw new Error('起点坐标无效或超出范围')
  }
  if (!isIntegerTuple(map.goal) || !inBounds(map.goal, width, height)) {
    throw new Error('终点坐标无效或超出范围')
  }
  if (map.movement !== 'four_way' && map.movement !== 'eight_way') {
    throw new Error('movement 必须是 four_way 或 eight_way')
  }
  if (!Array.isArray(map.obstacles) || !map.obstacles.every(isIntegerTuple)) {
    throw new Error('障碍物坐标格式无效')
  }
  if (map.obstacles.some((point) => !inBounds(point, width, height))) {
    throw new Error('障碍物坐标超出范围')
  }
  const startKey = map.start.join(',')
  const goalKey = map.goal.join(',')
  if (map.obstacles.some((point) => point.join(',') === startKey)) {
    throw new Error('起点不能位于障碍物中')
  }
  if (map.obstacles.some((point) => point.join(',') === goalKey)) {
    throw new Error('终点不能位于障碍物中')
  }
  if (!Array.isArray(map.terrain)) throw new Error('terrain 必须是数组')
  for (const cell of map.terrain) {
    if (
      !cell ||
      typeof cell !== 'object' ||
      !isIntegerTuple((cell as { point?: unknown }).point) ||
      !inBounds((cell as { point: PointTuple }).point, width, height) ||
      typeof (cell as { cost?: unknown }).cost !== 'number' ||
      Number((cell as { cost: number }).cost) <= 0
    ) {
      throw new Error('地形单元格式、坐标或代价无效')
    }
  }
}

export const parseGridJson = (text: string): GridMapDocument => {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('无法解析 JSON 文件')
  }
  validateGridDocument(value)
  return value
}
