import { describe, expect, it } from 'vitest'
import {
  isMazeImportWorkerResponse,
  isMazeImportWorkerResult,
} from './mazeImportWorkerProtocol'
import {
  createProgressFixture,
  createWorkerResultFixture,
} from './testUtils/mazeImportWorkerFixtures'

describe('mazeImportWorkerProtocol', () => {
  it.each([
    { type: 'started', requestId: 'request-1' },
    {
      type: 'progress',
      requestId: 'request-1',
      progress: createProgressFixture(),
    },
    {
      type: 'completed',
      requestId: 'request-1',
      result: createWorkerResultFixture(),
    },
    {
      type: 'failed',
      requestId: 'request-1',
      error: { code: 'FAILED', message: '失败。' },
    },
    { type: 'cancelled', requestId: 'request-1' },
    { type: 'pong', requestId: 'request-1' },
    { type: 'ready', workerGeneration: 0 },
  ])('接受合法 $type 响应', (message) => {
    expect(isMazeImportWorkerResponse(message)).toBe(true)
  })

  it.each([
    null,
    'progress',
    { type: 'started' },
    { type: 'unknown', requestId: 'request-1' },
    {
      type: 'progress',
      requestId: 'request-1',
      progress: { progress: 2 },
    },
    {
      type: 'failed',
      requestId: 'request-1',
      error: { message: '缺少代码' },
    },
  ])('拒绝非法响应 %#', (message) => {
    expect(isMazeImportWorkerResponse(message)).toBe(false)
  })

  it('拒绝字段不完整的 completed result', () => {
    expect(isMazeImportWorkerResult({
      ...createWorkerResultFixture(),
      diagnostics: null,
    })).toBe(false)
  })
})
