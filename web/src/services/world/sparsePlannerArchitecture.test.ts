import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { plannerWorkerClient, PlannerWorkerClient } from '@/services/plannerWorkerClient'
import {
  createSparsePlannerWorkerClient,
  sparsePlannerWorkerClient,
} from './sparsePlannerWorkerClient'

describe('稀疏 Planner 架构边界', () => {
  const source = (file: string): string =>
    readFileSync(resolve(process.cwd(), 'src/services/world', file), 'utf8')

  it('使用独立 PlannerWorkerClient 实例', () => {
    expect(sparsePlannerWorkerClient).toBeInstanceOf(PlannerWorkerClient)
    expect(sparsePlannerWorkerClient).not.toBe(plannerWorkerClient)
    expect(createSparsePlannerWorkerClient()).not.toBe(sparsePlannerWorkerClient)
  })

  it.each([
    '@/stores/grid',
    '@/stores/planner',
    '@/composables/usePlanner',
  ])('Worker Client 不导入 %s', (forbidden) => {
    expect(source('sparsePlannerWorkerClient.ts')).not.toContain(forbidden)
  })

  it.each([
    '@/stores/grid',
    '@/stores/planner',
    '@/composables/usePlanner',
    'planner.worker.ts',
    'new Worker',
  ])('Executor 不依赖 %s', (forbidden) => {
    expect(source('SparsePlannerExecutor.ts')).not.toContain(forbidden)
  })

  it('独立 Client 复用现有实现而不复制 Worker 协议', () => {
    const workerClientSource = source('sparsePlannerWorkerClient.ts')
    expect(workerClientSource).toContain('PlannerWorkerClient')
    expect(workerClientSource).not.toContain('postMessage')
    expect(workerClientSource).not.toContain('addEventListener')
  })
})
