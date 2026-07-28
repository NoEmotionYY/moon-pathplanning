import { describe, expect, it } from 'vitest'
import type { PlannerResult, PlannerWorkerResponse } from '@/types/planner'
import { PlannerWorkerClient, plannerWorkerClient } from '@/services/plannerWorkerClient'
import {
  createSparsePlannerWorkerClient,
  sparsePlannerWorkerClient,
} from './sparsePlannerWorkerClient'

const result: PlannerResult = {
  success: true,
  status: 'found',
  algorithm: 'astar',
  movement: 'four_way',
  path: [[0, 0], [1, 0]],
  pathNodes: 2,
  totalCost: 1,
  visitedNodes: 2,
  expandedNodes: 1,
  iterations: null,
  treeNodes: null,
  error: null,
}

class FakeWorker {
  readonly posted: unknown[] = []
  terminateCount = 0
  private messageListener?: (event: MessageEvent<PlannerWorkerResponse>) => void

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = listener as (event: MessageEvent<PlannerWorkerResponse>) => void
    if (type === 'message') this.messageListener = callback
  }

  postMessage(message: unknown): void { this.posted.push(message) }
  terminate(): void { this.terminateCount += 1 }
  emit(message: PlannerWorkerResponse): void {
    this.messageListener?.({ data: message } as MessageEvent<PlannerWorkerResponse>)
  }
}

describe('sparsePlannerWorkerClient', () => {
  it('创建独立于有限规划全局实例的客户端', () => {
    expect(sparsePlannerWorkerClient).toBeInstanceOf(PlannerWorkerClient)
    expect(sparsePlannerWorkerClient).not.toBe(plannerWorkerClient)
  })

  it('可注入 WorkerFactory 并完成现有协议请求', async () => {
    const worker = new FakeWorker()
    const client = createSparsePlannerWorkerClient(() => worker as unknown as Worker)
    const pending = client.request({
      algorithm: 'astar',
      map: {
        format: 'moon-pathplanning.grid.v1',
        width: 5,
        height: 5,
        start: [0, 0],
        goal: [1, 0],
        movement: 'four_way',
        obstacles: [],
        terrain: [],
      },
      options: {},
    }, 'sparse-1', 4, 'astar')
    expect(worker.posted[0]).toEqual(expect.objectContaining({
      type: 'run', requestId: 'sparse-1', mapVersion: 4,
    }))
    worker.emit({ type: 'run-completed', requestId: 'sparse-1', result })
    await expect(pending).resolves.toBe(result)
    client.dispose()
  })

  it('沿现有协议转发 trace-batch', async () => {
    const worker = new FakeWorker()
    const client = createSparsePlannerWorkerClient(() => worker as unknown as Worker)
    const traces: PlannerWorkerResponse[] = []
    const pending = client.request({
      algorithm: 'astar',
      map: {
        format: 'moon-pathplanning.grid.v1', width: 5, height: 5,
        start: [0, 0], goal: [1, 0], movement: 'four_way',
        obstacles: [], terrain: [],
      },
      options: {},
    }, 'sparse-2', 5, 'astar', (batch) => traces.push(batch))
    worker.emit({
      type: 'trace-batch', requestId: 'sparse-2', events: [], offset: 0,
      done: true, supported: true, mode: 'recorded', totalSteps: 0,
    })
    worker.emit({ type: 'run-completed', requestId: 'sparse-2', result })
    await pending
    expect(traces).toHaveLength(1)
    client.dispose()
  })

  it('cancel 只终止注入的独立 Worker', async () => {
    const worker = new FakeWorker()
    const client = createSparsePlannerWorkerClient(() => worker as unknown as Worker)
    const pending = client.request({
      algorithm: 'astar',
      map: {
        format: 'moon-pathplanning.grid.v1', width: 5, height: 5,
        start: [0, 0], goal: [1, 0], movement: 'four_way',
        obstacles: [], terrain: [],
      },
      options: {},
    }, 'sparse-3', 6, 'astar')
    client.cancel('sparse-3')
    await expect(pending).rejects.toBeInstanceOf(Error)
    expect(worker.terminateCount).toBe(1)
    expect(worker.posted).toContainEqual({ type: 'cancel', requestId: 'sparse-3' })
  })
})
