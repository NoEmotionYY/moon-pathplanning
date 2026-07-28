import { describe, expect, it } from 'vitest'
import type { PlannerResult, PlannerWorkerResponse } from '@/types/planner'
import { SparseGridWorld } from './SparseGridWorld'
import { SparsePlannerExecutor } from './SparsePlannerExecutor'
import { createSparsePlannerWorkerClient } from './sparsePlannerWorkerClient'

class CompletingWorker {
  private listener?: (event: MessageEvent<PlannerWorkerResponse>) => void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === 'message') {
      this.listener = listener as (event: MessageEvent<PlannerWorkerResponse>) => void
    }
  }
  postMessage(message: { type: string; requestId: string }): void {
    if (message.type !== 'run') return
    const result: PlannerResult = {
      success: true, status: 'found', algorithm: 'astar', movement: 'four_way',
      path: [[0, 0], [1, 0]], pathNodes: 2, totalCost: 1,
      visitedNodes: 2, expandedNodes: 1, iterations: null, treeNodes: null, error: null,
    }
    queueMicrotask(() => {
      this.listener?.({ data: {
        type: 'trace-batch', requestId: message.requestId,
        events: [{
          step: 0, kind: 'expanded', point: [0, 0],
          frontierSize: 1, source: null,
        }],
        offset: 0, done: true, supported: true, mode: 'recorded', totalSteps: 1,
      } } as MessageEvent<PlannerWorkerResponse>)
      this.listener?.({ data: {
        type: 'run-completed', requestId: message.requestId, result,
      } } as MessageEvent<PlannerWorkerResponse>)
    })
  }
  terminate(): void {}
}

describe('SparsePlannerExecutor 与真实 Client 类型集成', () => {
  it('经 PlannerWorkerClient 协议完成并回映结果与 Trace', async () => {
    const transport = createSparsePlannerWorkerClient(
      () => new CompletingWorker() as unknown as Worker,
    )
    const executor = new SparsePlannerExecutor({
      transport,
      createRequestId: () => 'integration-1',
    })
    const world = SparseGridWorld.create({
      start: { x: -10, y: -10 },
      goal: { x: -9, y: -10 },
      worldVersion: 3,
    })
    const traces: unknown[] = []
    const completed = await executor.run({
      world,
      algorithm: 'astar',
      window: { kind: 'derived', options: { margin: 2 } },
      getCurrentWorldVersion: () => 3,
      onTraceBatch: (batch) => traces.push(batch),
    })
    expect(completed.result.path).toEqual([[-12, -12], [-11, -12]])
    expect(traces).toEqual([
      expect.objectContaining({
        requestId: 'integration-1',
        events: [expect.objectContaining({ point: [-12, -12] })],
      }),
    ])
    executor.dispose()
  })
})
