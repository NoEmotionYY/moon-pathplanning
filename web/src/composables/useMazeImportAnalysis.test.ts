import { describe, expect, it, vi } from 'vitest'
import type { ImageMatrix } from '@/types/import'
import type { MazeImportWorkerResult } from '@/types/mazeImportWorker'
import type {
  MazeImportWorkerAnalyzeOptions,
  MazeImportWorkerClient,
} from '@/services/import/mazeImportWorkerClient'
import { MazeImportWorkerError } from '@/services/import/mazeImportWorkerError'
import {
  createProgressFixture,
  createWorkerResultFixture,
} from '@/services/import/testUtils/mazeImportWorkerFixtures'
import { useMazeImportAnalysis } from './useMazeImportAnalysis'

interface PendingAnalysis {
  options?: MazeImportWorkerAnalyzeOptions
  resolve: (result: MazeImportWorkerResult) => void
  reject: (error: MazeImportWorkerError) => void
  settled: boolean
}

class FakeClient implements MazeImportWorkerClient {
  readonly pending: PendingAnalysis[] = []
  private latestPending(): PendingAnalysis | undefined {
    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      const item = this.pending[index]
      if (item && !item.settled) {
        return item
      }
    }
    return undefined
  }

  readonly cancelCurrent = vi.fn(() => {
    const active = this.latestPending()
    if (active) {
      active.settled = true
      active.reject(new MazeImportWorkerError(
        'IMPORT_CANCELLED',
        '已取消。',
      ))
    }
  })
  readonly terminate = vi.fn(() => {
    const active = this.latestPending()
    if (active) {
      active.settled = true
      active.reject(new MazeImportWorkerError(
        'MAZE_IMPORT_WORKER_TERMINATED',
        '已终止。',
      ))
    }
  })

  analyze(
    _image: ImageMatrix,
    options?: MazeImportWorkerAnalyzeOptions,
  ): Promise<MazeImportWorkerResult> {
    return new Promise((resolve, reject) => {
      this.pending.push({
        options,
        resolve,
        reject,
        settled: false,
      })
    })
  }

  resolveLatest(result: MazeImportWorkerResult): void {
    const active = this.latestPending()
    if (!active) {
      throw new Error('没有待完成分析。')
    }
    active.settled = true
    active.resolve(result)
  }

  rejectLatest(error: MazeImportWorkerError): void {
    const active = this.latestPending()
    if (!active) {
      throw new Error('没有待完成分析。')
    }
    active.settled = true
    active.reject(error)
  }

  isBusy(): boolean {
    return this.pending.some((item) => !item.settled)
  }
}

const image: ImageMatrix = {
  width: 1,
  height: 1,
  rgba: new Uint8ClampedArray([255, 255, 255, 255]),
}

describe('useMazeImportAnalysis', () => {
  it('初始 idle，运行时更新进度，成功后保存 shallow result', async () => {
    const client = new FakeClient()
    const analysis = useMazeImportAnalysis(client)
    expect(analysis.status.value).toBe('idle')
    expect(analysis.result.value).toBeNull()

    const promise = analysis.analyze(image)
    expect(analysis.status.value).toBe('running')
    const progress = createProgressFixture()
    client.pending[0]!.options?.onProgress?.(progress)
    expect(analysis.progress.value).toEqual(progress)
    const result = createWorkerResultFixture('success')
    client.resolveLatest(result)
    await expect(promise).resolves.toBe(result)
    expect(analysis.status.value).toBe('success')
    expect(analysis.result.value).toBe(result)
    expect(analysis.error.value).toBeNull()
  })

  it.each([
    'manual-input-required',
    'unsupported-topology',
  ] as const)('映射 completed 状态 %s', async (status) => {
    const client = new FakeClient()
    const analysis = useMazeImportAnalysis(client)
    const promise = analysis.analyze(image)
    client.resolveLatest(createWorkerResultFixture(status))
    await promise
    expect(analysis.status.value).toBe(status)
  })

  it('流水线 failed 保存结构化 WorkerError', async () => {
    const client = new FakeClient()
    const analysis = useMazeImportAnalysis(client)
    const promise = analysis.analyze(image)
    client.resolveLatest(createWorkerResultFixture('failed'))
    await promise
    expect(analysis.status.value).toBe('failed')
    expect(analysis.error.value).toMatchObject({
      code: 'PIPELINE_FAILED',
      message: '流水线失败。',
    })
  })

  it('Worker 拒绝和主动取消分别进入 failed/cancelled', async () => {
    const failedClient = new FakeClient()
    const failed = useMazeImportAnalysis(failedClient)
    const failedPromise = failed.analyze(image)
    failedClient.rejectLatest(new MazeImportWorkerError(
      'MAZE_IMPORT_WORKER_CRASHED',
      'Worker 崩溃。',
    ))
    await failedPromise
    expect(failed.status.value).toBe('failed')
    expect(failed.error.value?.code).toBe(
      'MAZE_IMPORT_WORKER_CRASHED',
    )

    const cancelledClient = new FakeClient()
    const cancelled = useMazeImportAnalysis(cancelledClient)
    const cancelledPromise = cancelled.analyze(image)
    cancelled.cancel()
    await cancelledPromise
    expect(cancelled.status.value).toBe('cancelled')
    expect(cancelled.error.value?.code).toBe('IMPORT_CANCELLED')
    expect(cancelledClient.cancelCurrent).toHaveBeenCalledOnce()
  })

  it('新 analyze 自动取消旧请求且旧结果不能覆盖新状态', async () => {
    const client = new FakeClient()
    const analysis = useMazeImportAnalysis(client)
    const first = analysis.analyze(image)
    const second = analysis.analyze(image)
    expect(client.cancelCurrent).toHaveBeenCalledOnce()
    await expect(first).resolves.toBeNull()
    client.resolveLatest(
      createWorkerResultFixture('manual-input-required'),
    )
    await second
    expect(analysis.status.value).toBe('manual-input-required')
  })

  it('reset 清理状态但不修改地图，dispose 永久终止客户端', async () => {
    const client = new FakeClient()
    const analysis = useMazeImportAnalysis(client)
    const running = analysis.analyze(image)
    analysis.reset()
    await running
    expect(client.cancelCurrent).toHaveBeenCalledOnce()
    expect(analysis.status.value).toBe('idle')
    expect(analysis.progress.value).toBeNull()
    expect(analysis.result.value).toBeNull()
    expect(analysis.error.value).toBeNull()

    analysis.dispose()
    analysis.dispose()
    expect(client.terminate).toHaveBeenCalledOnce()
    await expect(analysis.analyze(image)).resolves.toBeNull()
    expect(analysis.status.value).toBe('failed')
    expect(analysis.error.value?.code).toBe(
      'MAZE_IMPORT_WORKER_TERMINATED',
    )
  })
})
