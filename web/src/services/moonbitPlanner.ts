import type { PlannerResult } from '@/types/planner'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const parsePlannerResult = (text: string): PlannerResult => {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('MoonBit Bridge 返回了无法解析的 JSON')
  }
  if (!value || typeof value !== 'object') throw new Error('MoonBit Bridge 返回值不是对象')
  const result = value as Partial<PlannerResult>
  if (
    typeof result.success !== 'boolean' ||
    !['found', 'no_path', 'invalid_input'].includes(String(result.status)) ||
    typeof result.algorithm !== 'string' ||
    !Array.isArray(result.path) ||
    !isFiniteNumber(result.pathNodes) ||
    !isFiniteNumber(result.totalCost) ||
    !isFiniteNumber(result.visitedNodes) ||
    !isFiniteNumber(result.expandedNodes) ||
    !result.trace ||
    typeof result.trace.supported !== 'boolean' ||
    !['recorded', 'none'].includes(result.trace.mode) ||
    !isFiniteNumber(result.trace.totalSteps) ||
    !Array.isArray(result.trace.events)
  ) {
    throw new Error('MoonBit Bridge 返回字段不完整')
  }
  for (const event of result.trace.events) {
    if (
      !isFiniteNumber(event.step) ||
      !['discovered', 'expanded', 'current'].includes(event.kind) ||
      !Array.isArray(event.point) ||
      event.point.length !== 2 ||
      !event.point.every(Number.isInteger) ||
      !isFiniteNumber(event.frontierSize)
    ) {
      throw new Error('MoonBit Bridge 返回了无效的搜索事件')
    }
  }
  return result as PlannerResult
}
