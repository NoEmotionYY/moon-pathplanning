import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ImageMatrix } from '@/types/import'
import type {
  MazeImportPipelineProgress,
  MazeImportPipelineResult,
} from '@/types/mazeImportPipeline'
import type {
  MazeImportWorkerAnalyzeRequest,
  MazeImportWorkerResponse,
} from '@/types/mazeImportWorker'
import { analyzeRasterMaze } from '@/services/import/analyzeRasterMaze'
import {
  createPipelineMazeFixture,
  createSolidImage,
} from '@/services/import/testUtils/generatePipelineImage'
import { createProgressFixture } from '@/services/import/testUtils/mazeImportWorkerFixtures'
import { createMazeImportWorkerHandler } from './mazeImportWorkerHandler'

const analyzeRequest = (
  requestId: string,
  image: ImageMatrix,
): MazeImportWorkerAnalyzeRequest => ({
  type: 'analyze',
  requestId,
  image,
  resultDetail: 'summary',
})

describe('createMazeImportWorkerHandler', () => {
  let successResult: MazeImportPipelineResult
  let failedResult: MazeImportPipelineResult
  let image: ImageMatrix

  beforeAll(async () => {
    image = createPipelineMazeFixture({ rows: 5, columns: 5 })
    successResult = await analyzeRasterMaze(image)
    failedResult = await analyzeRasterMaze(
      createSolidImage(40, 40, 255),
    )
  })

  it('回传 started、转发 progress 并以 completed 返回正常结果', async () => {
    const responses: MazeImportWorkerResponse[] = []
    const progress = createProgressFixture()
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: async (
        _image,
        _options,
        _signal,
        onProgress,
      ) => {
        onProgress?.(progress)
        return successResult
      },
    })
    await handler.handleMessage(analyzeRequest('request-1', image))
    expect(responses.map((response) => response.type)).toEqual([
      'started',
      'progress',
      'completed',
    ])
    expect(responses[1]).toMatchObject({
      type: 'progress',
      requestId: 'request-1',
      progress,
    })
    expect(responses[2]).toMatchObject({
      type: 'completed',
      requestId: 'request-1',
      result: { status: 'success', detail: 'summary' },
    })
  })

  it('流水线 failed 状态仍作为结构化 completed 返回', async () => {
    const responses: MazeImportWorkerResponse[] = []
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: async () => failedResult,
    })
    await handler.handleMessage(analyzeRequest('request-failed', image))
    expect(responses.at(-1)).toMatchObject({
      type: 'completed',
      result: { status: 'failed' },
    })
  })

  it('调用抛错时只返回 code/message，不跨线程发送 Error 或堆栈', async () => {
    const responses: MazeImportWorkerResponse[] = []
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: async () => {
        throw new Error('分析崩溃')
      },
    })
    await handler.handleMessage(analyzeRequest('request-error', image))
    const failed = responses.at(-1)
    expect(failed).toEqual({
      type: 'failed',
      requestId: 'request-error',
      error: {
        code: 'MAZE_IMPORT_WORKER_FAILED',
        message: '分析崩溃',
      },
    })
    expect(JSON.stringify(failed)).not.toContain('stack')
  })

  it('同一 Worker 忙碌时明确拒绝第二个 analyze', async () => {
    const responses: MazeImportWorkerResponse[] = []
    const deferred: {
      finish?: (result: MazeImportPipelineResult) => void
    } = {}
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: () => new Promise((resolve) => {
        deferred.finish = resolve
      }),
    })
    const first = handler.handleMessage(analyzeRequest('request-a', image))
    await handler.handleMessage(analyzeRequest('request-b', image))
    expect(responses).toContainEqual({
      type: 'failed',
      requestId: 'request-b',
      error: {
        code: 'MAZE_IMPORT_WORKER_BUSY',
        message: '迷宫分析 Worker 正在处理其他请求。',
      },
    })
    deferred.finish?.(successResult)
    await first
  })

  it('软取消活动任务并停止后续进度', async () => {
    const responses: MazeImportWorkerResponse[] = []
    let capturedProgress: (
      progress: MazeImportPipelineProgress,
    ) => void = () => undefined
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: (
        _image,
        _options,
        signal,
        onProgress,
      ) => new Promise((resolve) => {
        capturedProgress = onProgress ?? (() => undefined)
        signal?.addEventListener('abort', () => resolve(successResult), {
          once: true,
        })
      }),
    })
    const active = handler.handleMessage(
      analyzeRequest('request-cancel', image),
    )
    await handler.handleMessage({
      type: 'cancel',
      requestId: 'request-cancel',
    })
    capturedProgress(createProgressFixture())
    await active
    expect(responses.at(-1)).toEqual({
      type: 'cancelled',
      requestId: 'request-cancel',
    })
    expect(responses.some((response) => response.type === 'progress'))
      .toBe(false)
  })

  it('支持开始前取消、ping 和未知请求安全处理', async () => {
    const responses: MazeImportWorkerResponse[] = []
    const analyze = vi.fn(async () => successResult)
    const handler = createMazeImportWorkerHandler({
      postMessage: (response) => responses.push(response),
      analyzeRasterMaze: analyze,
    })
    await handler.handleMessage({
      type: 'cancel',
      requestId: 'request-before',
    })
    await handler.handleMessage(
      analyzeRequest('request-before', image),
    )
    await handler.handleMessage({
      type: 'ping',
      requestId: 'request-ping',
    })
    await handler.handleMessage({
      type: 'unknown',
      requestId: 'request-unknown',
    })
    await handler.handleMessage({ type: 'unknown' })
    expect(analyze).not.toHaveBeenCalled()
    expect(responses).toContainEqual({
      type: 'pong',
      requestId: 'request-ping',
    })
    expect(responses).toContainEqual({
      type: 'failed',
      requestId: 'request-unknown',
      error: {
        code: 'MAZE_IMPORT_WORKER_PROTOCOL_ERROR',
        message: 'Worker 收到无效的迷宫分析请求。',
      },
    })
  })
})
