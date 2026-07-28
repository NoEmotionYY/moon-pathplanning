import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMapImportTransactionDependencies,
} from '@/services/import/applyMapDocumentTransaction'
import type { GridMapDocument } from '@/types/grid'
import type {
  MapImportTransactionResult,
} from '@/types/mapImportTransaction'
import { useMazeMapApplication } from './useMazeMapApplication'

const document = (width = 41, height = 41): GridMapDocument => ({
  format: 'moon-pathplanning.grid.v1',
  width,
  height,
  start: [1, 0],
  goal: [width - 2, height - 1],
  movement: 'four_way',
  obstacles: [[0, 0], [2, 0]],
  terrain: [],
})

const result = (
  status: MapImportTransactionResult['status'] = 'success',
  code?: string,
): MapImportTransactionResult => ({
  status,
  applied: status === 'success',
  metrics: status === 'success'
    ? {
        previousMapVersion: 12,
        nextMapVersion: 13,
        width: 41,
        height: 41,
        obstacleCount: 2,
        terrainCount: 0,
        plannerWasRunning: false,
        traceWasActive: false,
        timing: {
          validationMs: 0,
          snapshotMs: 0,
          bulkApplyMs: 0,
          postconditionMs: 0,
          totalMs: 0,
        },
      }
    : null,
  error: code ? { code, message: '原始事务错误' } : null,
  warnings: [],
})

describe('useMazeMapApplication', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('二次确认前不调用事务，并显示正式尺寸能力', () => {
    const currentDocument = ref<GridMapDocument | null>(document())
    const transaction = vi.fn()
    const application = useMazeMapApplication(currentDocument, {
      transaction,
    })

    expect(application.capability.value?.allowed).toBe(true)
    application.requestConfirmation()

    expect(application.status.value).toBe('confirming')
    expect(transaction).not.toHaveBeenCalled()
    application.cancelConfirmation()
    expect(application.status.value).toBe('idle')
  })

  it('使用图片来源、乐观锁和保留偏好参数调用统一事务', async () => {
    const currentDocument = ref<GridMapDocument | null>(document())
    const transaction = vi.fn(async () => result())
    const createDependencies = vi.fn(createMapImportTransactionDependencies)
    const application = useMazeMapApplication(currentDocument, {
      transaction,
      createDependencies,
    })

    const transactionResult = await application.applyDocument(
      currentDocument.value!,
      12,
    )

    expect(transactionResult.applied).toBe(true)
    expect(createDependencies).toHaveBeenCalledOnce()
    expect(transaction).toHaveBeenCalledWith(
      currentDocument.value!,
      {
        source: 'maze-image',
        expectedCurrentMapVersion: 12,
        preserveSelectedAlgorithm: true,
        preservePlaybackSpeed: true,
      },
      expect.objectContaining({
        grid: expect.any(Object),
        planner: expect.any(Object),
      }),
    )
    expect(application.status.value).toBe('success')
  })

  it('61×61 仅可预览，尺寸拦截时不调用事务', async () => {
    const currentDocument = ref<GridMapDocument | null>(document(61, 61))
    const transaction = vi.fn()
    const application = useMazeMapApplication(currentDocument, {
      transaction,
    })

    application.requestConfirmation()
    const blocked = await application.applyDocument(
      currentDocument.value!,
      3,
    )

    expect(application.status.value).toBe('size-blocked')
    expect(application.error.value?.code).toBe(
      'MAP_IMPORT_RENDER_LIMIT_EXCEEDED',
    )
    expect(blocked.applied).toBe(false)
    expect(transaction).not.toHaveBeenCalled()
    expect(currentDocument.value!.width).toBe(61)
  })

  it.each([
    ['MAP_IMPORT_STALE_PREVIEW', 'stale'],
    ['MAP_IMPORT_TRANSACTION_BUSY', 'busy'],
    ['MAP_IMPORT_TRANSACTION_ROLLED_BACK', 'failed'],
    ['MAP_IMPORT_OTHER_FAILURE', 'failed'],
  ] as const)('把 %s 映射为 %s 状态', async (code, expectedStatus) => {
    const currentDocument = ref<GridMapDocument | null>(document())
    const transaction = vi.fn(async () =>
      result(
        code === 'MAP_IMPORT_TRANSACTION_BUSY' ? 'busy' : 'failed',
        code,
      ))
    const application = useMazeMapApplication(currentDocument, {
      transaction,
    })

    await application.applyDocument(currentDocument.value!, 1)

    expect(application.status.value).toBe(expectedStatus)
    expect(application.error.value?.code).toBe(code)
    if (code === 'MAP_IMPORT_TRANSACTION_ROLLED_BACK') {
      expect(application.error.value?.message).toContain('原地图状态已经恢复')
    }
  })

  it('连续确认只启动一个事务', async () => {
    const currentDocument = ref<GridMapDocument | null>(document())
    let finish!: (value: MapImportTransactionResult) => void
    const transaction = vi.fn(() =>
      new Promise<MapImportTransactionResult>((resolve) => {
        finish = resolve
      }))
    const application = useMazeMapApplication(currentDocument, {
      transaction,
    })

    const first = application.applyDocument(currentDocument.value!, 0)
    const second = await application.applyDocument(currentDocument.value!, 0)
    expect(second.error?.code).toBe('MAP_IMPORT_TRANSACTION_BUSY')
    expect(transaction).toHaveBeenCalledOnce()

    finish(result())
    await first
    expect(application.isApplying.value).toBe(false)
  })
})
