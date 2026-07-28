import { describe, expect, it } from 'vitest'
import type { PlannerResult, TraceBatchMessage } from '@/types/planner'
import { SparseGridWorld } from './SparseGridWorld'
import { createWorldBounds } from './worldBounds'
import { SparsePlannerExecutor } from './SparsePlannerExecutor'
import { FakeSparsePlannerTransport } from './__tests__/FakeSparsePlannerTransport'

const plannerResult = (
  status: PlannerResult['status'] = 'found',
): PlannerResult => ({
  success: status === 'found',
  status,
  algorithm: 'astar',
  movement: 'four_way',
  path: status === 'found' ? [[0, 0], [1, 1]] : [],
  pathNodes: status === 'found' ? 2 : 0,
  totalCost: status === 'found' ? 2 : 0,
  visitedNodes: 3,
  expandedNodes: 2,
  iterations: null,
  treeNodes: null,
  error: null,
})

const traceBatch = (events: TraceBatchMessage['events'] = [{
  step: 0,
  kind: 'expanded',
  point: [0, 0],
  frontierSize: 1,
  source: null,
}]): TraceBatchMessage => ({
  type: 'trace-batch',
  requestId: 'request-1',
  events,
  offset: 4,
  done: false,
  supported: true,
  mode: 'recorded',
  totalSteps: 9,
})

const setup = (options: {
  version?: number
  now?: () => number
  requestId?: string
} = {}) => {
  const world = SparseGridWorld.create({
    start: { x: -2, y: -1 },
    goal: { x: 1, y: 1 },
    worldVersion: options.version ?? 8,
  })
  const transport = new FakeSparsePlannerTransport()
  const executor = new SparsePlannerExecutor({
    transport,
    createRequestId: () => options.requestId ?? 'request-1',
    now: options.now ?? (() => 10),
  })
  let currentVersion = world.worldVersion
  const input = {
    world,
    algorithm: 'astar' as const,
    window: {
      kind: 'explicit' as const,
      request: {
        bounds: createWorldBounds(-2, -1, 3, 4),
      },
    },
    getCurrentWorldVersion: () => currentVersion,
  }
  return {
    world, transport, executor, input,
    setVersion: (version: number) => { currentVersion = version },
  }
}

describe('SparsePlannerExecutor', () => {
  it('执行显式窗口并只发送有限 grid.v1 文档', async () => {
    const { executor, transport, input } = setup()
    const options = { weight: 2 }
    const pending = executor.run({ ...input, plannerOptions: options })
    expect(transport.requests).toHaveLength(1)
    const call = transport.requests[0]!
    expect(call.requestId).toBe('request-1')
    expect(call.mapVersion).toBe(8)
    expect(call.algorithm).toBe('astar')
    expect(call.timeoutMs).toBe(20_000)
    expect(call.payload).toEqual(expect.objectContaining({
      algorithm: 'astar',
      map: expect.objectContaining({ format: 'moon-pathplanning.grid.v1' }),
      options: { weight: 2 },
    }))
    expect(call.payload).not.toHaveProperty('world')
    expect(call.payload).not.toHaveProperty('chunks')
    expect(call.payload.options).not.toBe(options)
    transport.resolve(plannerResult())
    const completed = await pending
    expect(completed.result.path).toEqual([[-2, -1], [-1, 0]])
    expect(completed.result.sourceWorldVersion).toBe(8)
    expect(completed.metrics).toEqual(expect.objectContaining({
      requestId: 'request-1',
      width: 5,
      height: 5,
      cellCount: 25,
      obstacleCount: 0,
      terrainCount: 0,
    }))
    expect(executor.snapshot.phase).toBe('completed')
  })

  it.each([
    ['found', 'found', true],
    ['no_path', 'no_path_in_window', false],
    ['invalid_input', 'invalid_input', true],
  ] as const)('将 %s 结果映射为 %s', async (localStatus, worldStatus, conclusive) => {
    const { executor, transport, input } = setup()
    const pending = executor.run(input)
    transport.resolve(plannerResult(localStatus))
    const result = await pending
    expect(result.result.status).toBe(worldStatus)
    expect(result.result.globallyConclusive).toBe(conclusive)
  })

  it('执行派生窗口并使用请求 timeout', async () => {
    const { executor, transport, input } = setup()
    const pending = executor.run({
      ...input,
      window: { kind: 'derived', options: { margin: 0, timeoutMs: 777 } },
    })
    expect(transport.requests[0]!.timeoutMs).toBe(777)
    transport.resolve(plannerResult())
    expect((await pending).materialized.request.timeoutMs).toBe(777)
  })

  it('maxExpandedNodes 与 tracePolicy 只保留在窗口请求中', async () => {
    const { executor, transport, input } = setup()
    const pending = executor.run({
      ...input,
      window: {
        kind: 'explicit',
        request: {
          ...input.window.request,
          maxExpandedNodes: 999,
          tracePolicy: 'disabled',
        },
      },
    })
    expect(transport.requests[0]!.payload.options).toEqual({})
    transport.resolve(plannerResult())
    const completed = await pending
    expect(completed.materialized.request).toEqual(expect.objectContaining({
      maxExpandedNodes: 999,
      tracePolicy: 'disabled',
    }))
  })

  it('实时回映负世界坐标 Trace 且保留协议字段', async () => {
    const { executor, transport, input } = setup()
    const received: TraceBatchMessage[] = []
    const pending = executor.run({
      ...input,
      onTraceBatch: (batch) => { received.push(batch as unknown as TraceBatchMessage) },
    })
    const local = traceBatch()
    transport.emitTrace(local)
    expect(received[0]).toEqual(expect.objectContaining({
      requestId: 'request-1',
      offset: 4,
      done: false,
      totalSteps: 9,
      events: [expect.objectContaining({ point: [-2, -1] })],
      sourceWorldVersion: 8,
      worldBounds: { minX: -2, minY: -1, maxX: 3, maxY: 4 },
    }))
    expect(local.events[0]!.point).toEqual([0, 0])
    transport.resolve(plannerResult())
    const completed = await pending
    expect(completed.metrics.receivedTraceBatchCount).toBe(1)
    expect(completed.metrics.receivedTraceEventCount).toBe(1)
  })

  it('接受空 Trace batch', async () => {
    const { executor, transport, input } = setup()
    const pending = executor.run(input)
    transport.emitTrace(traceBatch([]))
    transport.resolve(plannerResult())
    expect((await pending).metrics).toEqual(expect.objectContaining({
      receivedTraceBatchCount: 1,
      receivedTraceEventCount: 0,
    }))
  })

  it('Trace 越界保留物化错误并终止', async () => {
    const { executor, transport, input } = setup()
    const pending = executor.run(input)
    transport.emitTrace(traceBatch([{
      step: 0, kind: 'expanded', point: [99, 99], frontierSize: 0, source: null,
    }]))
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNING_TRACE_POINT_OUT_OF_BOUNDS',
    })
    expect(transport.hardCancelled).toEqual(['request-1'])
  })

  it('外部 Trace 回调异常映射并终止', async () => {
    const { executor, transport, input } = setup()
    const pending = executor.run({
      ...input,
      onTraceBatch: () => { throw new Error('callback') },
    })
    transport.emitTrace(traceBatch())
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNER_TRACE_CALLBACK_FAILED',
    })
    expect(transport.hardCancelled).toEqual(['request-1'])
  })

  it('开始前 stale 不启动 transport', async () => {
    const context = setup()
    context.setVersion(9)
    await expect(context.executor.run(context.input)).rejects.toMatchObject({
      code: 'SPARSE_PLANNING_WORLD_VERSION_STALE',
    })
    expect(context.transport.requests).toHaveLength(0)
  })

  it('Trace 到达时 stale 并忽略后续批次', async () => {
    const context = setup()
    let callbacks = 0
    const pending = context.executor.run({
      ...context.input,
      onTraceBatch: () => { callbacks += 1 },
    })
    context.setVersion(9)
    context.transport.emitTrace(traceBatch())
    context.transport.emitTrace(traceBatch())
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNING_WORLD_VERSION_STALE',
    })
    expect(callbacks).toBe(0)
    expect(context.transport.hardCancelled).toEqual(['request-1'])
  })

  it('最终结果到达时 stale', async () => {
    const context = setup()
    const pending = context.executor.run(context.input)
    context.setVersion(9)
    context.transport.resolve(plannerResult())
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNING_WORLD_VERSION_STALE',
    })
    expect(context.transport.hardCancelled).toEqual(['request-1'])
  })

  it('物化完成后的版本变化会在 Worker 启动前拒绝', async () => {
    const context = setup()
    let reads = 0
    await expect(context.executor.run({
      ...context.input,
      getCurrentWorldVersion: () => ++reads === 1 ? 8 : 9,
    })).rejects.toMatchObject({ code: 'SPARSE_PLANNING_WORLD_VERSION_STALE' })
    expect(context.transport.requests).toHaveLength(0)
  })

  it('idle cancel 返回 false', () => {
    expect(setup().executor.cancel()).toBe(false)
  })

  it('running cancel 终止 run 并允许再次运行', async () => {
    const context = setup()
    const first = context.executor.run(context.input)
    expect(context.executor.cancel()).toBe(true)
    await expect(first).rejects.toMatchObject({ code: 'SPARSE_PLANNER_CANCELLED' })
    expect(context.transport.cancelled).toEqual(['request-1'])
    const second = context.executor.run(context.input)
    context.transport.resolve(plannerResult())
    await expect(second).resolves.toMatchObject({ requestId: 'request-1' })
  })

  it('cancel 自身异常不会永久占用执行器', async () => {
    const context = setup()
    context.transport.throwOnCancel = new Error('cancel failed')
    const pending = context.executor.run(context.input)
    expect(context.executor.cancel()).toBe(true)
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNER_EXECUTION_FAILED',
    })
    expect(context.executor.isRunning).toBe(false)
  })

  it('拒绝并发请求且不取消首个请求', async () => {
    const context = setup()
    const first = context.executor.run(context.input)
    await expect(context.executor.run(context.input)).rejects.toMatchObject({
      code: 'SPARSE_PLANNER_ALREADY_RUNNING',
    })
    expect(context.transport.requests).toHaveLength(1)
    expect(context.transport.cancelled).toHaveLength(0)
    context.transport.resolve(plannerResult())
    await first
  })

  it('idle dispose 幂等且拒绝未来 run/cancel', async () => {
    const context = setup()
    context.executor.dispose()
    context.executor.dispose()
    expect(context.transport.disposeCount).toBe(1)
    expect(context.executor.cancel()).toBe(false)
    await expect(context.executor.run(context.input)).rejects.toMatchObject({
      code: 'SPARSE_PLANNER_DISPOSED',
    })
  })

  it('running dispose hardCancel 且 run 拒绝', async () => {
    const context = setup()
    const pending = context.executor.run(context.input)
    context.executor.dispose()
    await expect(pending).rejects.toMatchObject({ code: 'SPARSE_PLANNER_DISPOSED' })
    expect(context.transport.hardCancelled).toEqual(['request-1'])
    context.transport.emitTrace(traceBatch())
    context.transport.resolve(plannerResult())
  })

  it.each([
    ['路径规划请求超时', 'SPARSE_PLANNER_REQUEST_TIMEOUT'],
    ['request timeout', 'SPARSE_PLANNER_REQUEST_TIMEOUT'],
    ['worker crashed', 'SPARSE_PLANNER_WORKER_FAILED'],
  ])('映射 transport 错误 %s', async (message, code) => {
    const context = setup()
    const pending = context.executor.run(context.input)
    context.transport.reject(new Error(message))
    await expect(pending).rejects.toMatchObject({ code })
    expect(context.executor.isRunning).toBe(false)
  })

  it('未知非 Error 拒绝包装为通用执行错误', async () => {
    const context = setup()
    const pending = context.executor.run(context.input)
    context.transport.reject({ unexpected: true })
    await expect(pending).rejects.toMatchObject({
      code: 'SPARSE_PLANNER_EXECUTION_FAILED',
    })
  })

  it('Worker 失败后可再次运行', async () => {
    const context = setup()
    const first = context.executor.run(context.input)
    context.transport.reject(new Error('worker failed'))
    await expect(first).rejects.toMatchObject({ code: 'SPARSE_PLANNER_WORKER_FAILED' })
    const second = context.executor.run(context.input)
    context.transport.resolve(plannerResult())
    await expect(second).resolves.toMatchObject({ requestId: 'request-1' })
  })

  it('151×151 空窗口只发送空障碍与 terrain 数组', async () => {
    const world = SparseGridWorld.create({
      start: { x: 0, y: 0 }, goal: { x: 150, y: 150 }, worldVersion: 2,
    })
    const transport = new FakeSparsePlannerTransport()
    const executor = new SparsePlannerExecutor({ transport, createRequestId: () => '151' })
    const pending = executor.run({
      world,
      algorithm: 'astar',
      window: {
        kind: 'explicit',
        request: { bounds: createWorldBounds(0, 0, 151, 151) },
      },
      getCurrentWorldVersion: () => 2,
    })
    expect(transport.requests[0]!.payload.map).toEqual(expect.objectContaining({
      width: 151, height: 151, obstacles: [], terrain: [],
    }))
    transport.resolve(plannerResult('no_path'))
    await pending
  })

  it('100,000 障碍世界只物化并发送窗口内内容', async () => {
    const obstacleUpdates = Array.from({ length: 100_000 }, (_, index) => ({
      point: { x: 1_000 + index % 1_000, y: Math.floor(index / 1_000) },
      blocked: true,
    }))
    const world = SparseGridWorld.createFromPatch({
      start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, worldVersion: 12,
    }, { obstacleUpdates })
    const transport = new FakeSparsePlannerTransport()
    const executor = new SparsePlannerExecutor({ transport, createRequestId: () => 'large' })
    const pending = executor.run({
      world,
      algorithm: 'astar',
      window: {
        kind: 'explicit',
        request: { bounds: createWorldBounds(-2, -2, 3, 3) },
      },
      getCurrentWorldVersion: () => 12,
    })
    const map = transport.requests[0]!.payload.map
    expect(map.obstacles).toEqual([])
    expect(map.terrain).toEqual([])
    expect(JSON.stringify(map)).not.toContain('"chunks"')
    expect(world.worldVersion).toBe(12)
    expect(world.chunkCount).toBeGreaterThan(0)
    transport.resolve(plannerResult())
    await pending
  })

  it('超远派生端点错误不启动 Worker', async () => {
    const world = SparseGridWorld.create({
      start: { x: 0, y: 0 },
      goal: { x: 151, y: 0 },
    })
    const transport = new FakeSparsePlannerTransport()
    const executor = new SparsePlannerExecutor({ transport })
    await expect(executor.run({
      world,
      algorithm: 'astar',
      window: { kind: 'derived' },
      getCurrentWorldVersion: () => world.worldVersion,
    })).rejects.toMatchObject({ code: 'SPARSE_PLANNING_ENDPOINT_SPAN_TOO_LARGE' })
    expect(transport.requests).toHaveLength(0)
  })

  it('所有执行时间都不会为负数', async () => {
    const values = [10, 5, 2, 1]
    const context = setup({ now: () => values.shift() ?? 0 })
    const pending = context.executor.run(context.input)
    context.transport.resolve(plannerResult())
    const metrics = (await pending).metrics
    expect(metrics.materializationMs).toBe(0)
    expect(metrics.workerMs).toBe(0)
    expect(metrics.totalMs).toBe(0)
  })
})
