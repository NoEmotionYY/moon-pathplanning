/// <reference lib="webworker" />
import { analyzeRasterMaze } from '@/services/import/analyzeRasterMaze'
import type {
  MazeImportWorkerResponse,
} from '@/types/mazeImportWorker'
import { createMazeImportWorkerHandler } from './mazeImportWorkerHandler'

const send = (response: MazeImportWorkerResponse): void => {
  self.postMessage(response)
}

const handler = createMazeImportWorkerHandler({
  postMessage: send,
  analyzeRasterMaze,
})

self.onmessage = (event: MessageEvent<unknown>): void => {
  void handler.handleMessage(event.data).catch(() => {
    const value = event.data
    const requestId =
      value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).requestId === 'string'
        ? String((value as Record<string, unknown>).requestId)
        : 'unknown'
    send({
      type: 'failed',
      requestId,
      error: {
        code: 'MAZE_IMPORT_WORKER_FAILED',
        message: '迷宫分析 Worker 发生未捕获异常。',
      },
    })
  })
}

send({
  type: 'ready',
  workerGeneration: 0,
})
