import { describe, expect, it, vi } from 'vitest'
import type { ImageMatrix } from '@/types/import'
import type {
  MazeImportWorkerAnalyzeRequest,
  MazeImportWorkerResponse,
} from '@/types/mazeImportWorker'
import {
  createMazeImportWorkerClient,
  type WorkerLike,
} from './mazeImportWorkerClient'
import {
  createProgressFixture,
  createWorkerResultFixture,
} from './testUtils/mazeImportWorkerFixtures'

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror:
    ((event: MessageEvent<unknown>) => void) | null = null
  readonly posts: Array<{
    message: unknown
    transfer: Transferable[]
  }> = []
  terminateCount = 0
  throwOnPost = false

  postMessage(
    message: unknown,
    transfer: Transferable[] = [],
  ): void {
    if (this.throwOnPost) {
      throw new Error('post failed')
    }
    this.posts.push({ message, transfer })
  }

  terminate(): void {
    this.terminateCount += 1
  }

  emit(response: MazeImportWorkerResponse | unknown): void {
    this.onmessage?.({ data: response } as MessageEvent<unknown>)
  }

  crash(): void {
    this.onerror?.({
      preventDefault: vi.fn(),
    } as unknown as ErrorEvent)
  }

  messageError(): void {
    this.onmessageerror?.({
      data: null,
    } as MessageEvent<unknown>)
  }
}

const createImage = (): ImageMatrix => ({
  width: 2,
  height: 2,
  rgba: new Uint8ClampedArray([
    0, 0, 0, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    0, 0, 0, 255,
  ]),
})

const requestFrom = (worker: FakeWorker): MazeImportWorkerAnalyzeRequest =>
  worker.posts.at(-1)!.message as MazeImportWorkerAnalyzeRequest

const completed = (
  requestId: string,
): MazeImportWorkerResponse => ({
  type: 'completed',
  requestId,
  result: createWorkerResultFixture(),
})

describe('createMazeImportWorkerClient', () => {
  it('发送单次 RGBA 副本及其 transfer buffer，保留原图', async () => {
    const worker = new FakeWorker()
    const image = createImage()
    const original = new Uint8ClampedArray(image.rgba)
    const client = createMazeImportWorkerClient({
      workerFactory: () => worker,
      createRequestId: () => 'request-copy',
    })
    const promise = client.analyze(image)
    const post = worker.posts[0]!
    const request = post.message as MazeImportWorkerAnalyzeRequest
    expect(request.image.rgba).not.toBe(image.rgba)
    expect(request.image.rgba).toEqual(original)
    expect(post.transfer).toEqual([request.image.rgba.buffer])
    expect(image.rgba).toEqual(original)
    expect(request.resultDetail).toBe('preview')
    worker.emit(completed(request.requestId))
    await expect(promise).resolves.toMatchObject({ status: 'success' })
  })

  it('只转发当前请求的递增进度，忽略错 ID、重复和倒退', async () => {
    const worker = new FakeWorker()
    const updates: number[] = []
    const client = createMazeImportWorkerClient({
      workerFactory: () => worker,
      createRequestId: () => 'request-progress',
    })
    const promise = client.analyze(createImage(), {
      onProgress: (progress) => {
        updates.push(progress.progress)
        if (progress.progress === 0.5) {
          throw new Error('observer failed')
        }
      },
    })
    const request = requestFrom(worker)
    worker.emit({
      type: 'progress',
      requestId: 'stale-request',
      progress: createProgressFixture(0.9),
    })
    for (const value of [0.5, 0.5, 0.4, 0.8]) {
      worker.emit({
        type: 'progress',
        requestId: request.requestId,
        progress: createProgressFixture(value),
      })
    }
    worker.emit(completed(request.requestId))
    await promise
    expect(updates).toEqual([0.5, 0.8])
  })

  it('调用前 AbortSignal 已取消时不创建 Worker', async () => {
    const factory = vi.fn(() => new FakeWorker())
    const controller = new AbortController()
    controller.abort()
    const client = createMazeImportWorkerClient({
      workerFactory: factory,
    })
    await expect(client.analyze(createImage(), {
      signal: controller.signal,
    })).rejects.toMatchObject({ code: 'IMPORT_CANCELLED' })
    expect(factory).not.toHaveBeenCalled()
  })

  it('运行中 AbortSignal 和 cancelCurrent 都硬终止且重复取消幂等', async () => {
    const workers: FakeWorker[] = []
    const client = createMazeImportWorkerClient({
      workerFactory: () => {
        const worker = new FakeWorker()
        workers.push(worker)
        return worker
      },
    })
    const controller = new AbortController()
    const first = client.analyze(createImage(), {
      signal: controller.signal,
    })
    controller.abort()
    await expect(first).rejects.toMatchObject({
      code: 'IMPORT_CANCELLED',
    })
    expect(workers[0]!.terminateCount).toBe(1)
    client.cancelCurrent()
    client.cancelCurrent()
    expect(workers[0]!.terminateCount).toBe(1)

    const second = client.analyze(createImage())
    expect(workers).toHaveLength(2)
    const secondRequest = requestFrom(workers[1]!)
    workers[1]!.emit(completed(secondRequest.requestId))
    await expect(second).resolves.toMatchObject({ status: 'success' })
    client.cancelCurrent()
    expect(workers[1]!.terminateCount).toBe(0)
  })

  it('latest-wins 终止 A，generation 与 requestId 隔离迟到消息', async () => {
    const workers: FakeWorker[] = []
    let id = 0
    const client = createMazeImportWorkerClient({
      workerFactory: () => {
        const worker = new FakeWorker()
        workers.push(worker)
        return worker
      },
      createRequestId: () => `request-${++id}`,
    })
    const first = client.analyze(createImage())
    const oldHandler = workers[0]!.onmessage!
    const firstOutcome = first.catch((error: unknown) => error)
    const second = client.analyze(createImage())
    await expect(firstOutcome).resolves.toMatchObject({
      code: 'IMPORT_CANCELLED',
      requestId: 'request-1',
    })
    expect(workers[0]!.terminateCount).toBe(1)
    expect(workers).toHaveLength(2)

    oldHandler({
      data: completed('request-2'),
    } as MessageEvent<unknown>)
    expect(client.isBusy()).toBe(true)
    workers[1]!.emit({
      type: 'completed',
      requestId: 'request-1',
      result: { invalid: true },
    })
    expect(client.isBusy()).toBe(true)
    workers[1]!.emit(completed('request-2'))
    await expect(second).resolves.toMatchObject({ status: 'success' })
  })

  it('reject-when-busy 拒绝第二请求且不影响第一请求', async () => {
    const worker = new FakeWorker()
    const client = createMazeImportWorkerClient({
      workerFactory: () => worker,
      concurrencyPolicy: 'reject-when-busy',
      createRequestId: () => 'request-first',
    })
    const first = client.analyze(createImage())
    await expect(client.analyze(createImage())).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_BUSY',
    })
    expect(worker.posts).toHaveLength(1)
    expect(worker.terminateCount).toBe(0)
    worker.emit(completed('request-first'))
    await first
  })

  it('onerror 清理损坏 Worker，下一请求使用新 Worker', async () => {
    const workers: FakeWorker[] = []
    const client = createMazeImportWorkerClient({
      workerFactory: () => {
        const worker = new FakeWorker()
        workers.push(worker)
        return worker
      },
    })
    const first = client.analyze(createImage())
    workers[0]!.crash()
    await expect(first).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_CRASHED',
    })
    expect(workers[0]!.terminateCount).toBe(1)
    const second = client.analyze(createImage())
    const request = requestFrom(workers[1]!)
    workers[1]!.emit(completed(request.requestId))
    await expect(second).resolves.toMatchObject({ status: 'success' })
  })

  it('messageerror、postMessage 异常和非法结果均被标准化', async () => {
    const messageWorker = new FakeWorker()
    const messageClient = createMazeImportWorkerClient({
      workerFactory: () => messageWorker,
    })
    const messagePromise = messageClient.analyze(createImage())
    messageWorker.messageError()
    await expect(messagePromise).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_PROTOCOL_ERROR',
    })

    const postWorker = new FakeWorker()
    postWorker.throwOnPost = true
    const postClient = createMazeImportWorkerClient({
      workerFactory: () => postWorker,
    })
    await expect(postClient.analyze(createImage())).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_POST_FAILED',
    })

    const invalidWorker = new FakeWorker()
    const invalidClient = createMazeImportWorkerClient({
      workerFactory: () => invalidWorker,
      createRequestId: () => 'request-invalid',
    })
    const invalidPromise = invalidClient.analyze(createImage())
    invalidWorker.emit({
      type: 'completed',
      requestId: 'request-invalid',
      result: { status: 'success' },
    })
    await expect(invalidPromise).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_RESULT_INVALID',
    })
  })

  it('terminate 永久关闭客户端并结束活动 Promise', async () => {
    const worker = new FakeWorker()
    const client = createMazeImportWorkerClient({
      workerFactory: () => worker,
    })
    const active = client.analyze(createImage())
    client.terminate()
    client.terminate()
    await expect(active).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_TERMINATED',
    })
    expect(worker.terminateCount).toBe(1)
    await expect(client.analyze(createImage())).rejects.toMatchObject({
      code: 'MAZE_IMPORT_WORKER_TERMINATED',
    })
  })
})
