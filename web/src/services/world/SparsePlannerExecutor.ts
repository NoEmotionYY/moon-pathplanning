import { SPARSE_PLANNER_EXECUTION_LIMITS } from '@/config/worldGrid'
import type { PlannerRequest, PlannerResult, TraceBatchMessage } from '@/types/planner'
import type {
  SparsePlannerExecutionResult,
  SparsePlannerExecutionSnapshot,
  SparsePlannerRunInput,
} from '@/types/sparsePlannerExecution'
import type { MaterializedSparsePlanningWindow } from '@/types/worldPlanning'
import { deriveSparsePlanningWindow } from './deriveSparsePlanningWindow'
import { materializeSparsePlanningWindow } from './materializeSparsePlanningWindow'
import { remapPlannerResultToWorld } from './remapPlannerResultToWorld'
import { remapTraceBatchToWorld } from './remapWorldTrace'
import { SparsePlanningError, sparsePlanningError } from './sparsePlanningError'
import {
  SparsePlannerExecutionError,
  sparsePlannerExecutionError,
} from './sparsePlannerExecutionError'
import type { SparsePlannerTransport } from './sparsePlannerTransport'
import { sparsePlannerWorkerClient } from './sparsePlannerWorkerClient'

export interface SparsePlannerExecutorDependencies {
  readonly transport: SparsePlannerTransport
  readonly createRequestId?: () => string
  readonly now?: () => number
}

interface ActiveExecution {
  readonly generation: number
  readonly requestId: string
  readonly sourceWorldVersion: number
  reject: (reason: unknown) => void
  staleReason: SparsePlanningError | null
  cancelledReason: SparsePlannerExecutionError | null
}

const nonNegativeDuration = (start: number, end: number): number =>
  Math.max(0, end - start)

const errorSnapshot = (error: unknown): { code: string; message: string } =>
  error instanceof SparsePlanningError || error instanceof SparsePlannerExecutionError
    ? { code: error.code, message: error.message }
    : { code: 'SPARSE_PLANNER_EXECUTION_FAILED', message: '稀疏世界规划执行失败' }

export class SparsePlannerExecutor {
  private readonly transport: SparsePlannerTransport
  private readonly createRequestId: () => string
  private readonly now: () => number
  private active: ActiveExecution | null = null
  private disposed = false
  private generation = 0
  private currentSnapshot: SparsePlannerExecutionSnapshot = {
    phase: 'idle',
    requestId: null,
    sourceWorldVersion: null,
    error: null,
  }

  constructor(dependencies: Partial<SparsePlannerExecutorDependencies> = {}) {
    this.transport = dependencies.transport ?? sparsePlannerWorkerClient
    this.createRequestId = dependencies.createRequestId ?? (() => crypto.randomUUID())
    this.now = dependencies.now ?? (() => performance.now())
  }

  get snapshot(): SparsePlannerExecutionSnapshot {
    return {
      ...this.currentSnapshot,
      error: this.currentSnapshot.error ? { ...this.currentSnapshot.error } : null,
    }
  }

  get isRunning(): boolean {
    return this.active !== null
  }

  async run(input: SparsePlannerRunInput): Promise<SparsePlannerExecutionResult> {
    if (this.disposed) throw sparsePlannerExecutionError('SPARSE_PLANNER_DISPOSED')
    if (this.active) throw sparsePlannerExecutionError('SPARSE_PLANNER_ALREADY_RUNNING')
    if (
      !input || !input.world || typeof input.getCurrentWorldVersion !== 'function' ||
      !input.window || (input.window.kind !== 'explicit' && input.window.kind !== 'derived')
    ) throw sparsePlannerExecutionError('SPARSE_PLANNER_EXECUTION_FAILED')

    const sourceWorldVersion = input.world.worldVersion
    if (input.getCurrentWorldVersion() !== sourceWorldVersion) {
      const stale = sparsePlanningError('SPARSE_PLANNING_WORLD_VERSION_STALE', {
        sourceWorldVersion,
        currentWorldVersion: input.getCurrentWorldVersion(),
      })
      this.currentSnapshot = {
        phase: 'stale', requestId: null, sourceWorldVersion, error: errorSnapshot(stale),
      }
      throw stale
    }

    const requestId = this.createRequestId()
    const generation = ++this.generation
    let rejectControl!: (reason: unknown) => void
    const control = new Promise<never>((_resolve, reject) => { rejectControl = reject })
    const active: ActiveExecution = {
      generation,
      requestId,
      sourceWorldVersion,
      reject: rejectControl,
      staleReason: null,
      cancelledReason: null,
    }
    this.active = active
    this.currentSnapshot = {
      phase: 'materializing', requestId, sourceWorldVersion, error: null,
    }

    const totalStartedAt = this.now()
    let materializationFinishedAt = totalStartedAt
    let workerStarted = false
    let receivedTraceBatchCount = 0
    let receivedTraceEventCount = 0

    const staleIfNeeded = (): SparsePlanningError | null => {
      const currentWorldVersion = input.getCurrentWorldVersion()
      if (currentWorldVersion === sourceWorldVersion) return null
      return sparsePlanningError('SPARSE_PLANNING_WORLD_VERSION_STALE', {
        sourceWorldVersion,
        currentWorldVersion,
      })
    }

    const abortAsStale = (reason: SparsePlanningError): void => {
      if (this.active !== active || active.staleReason) return
      active.staleReason = reason
      this.currentSnapshot = {
        phase: 'stale', requestId, sourceWorldVersion, error: errorSnapshot(reason),
      }
      try { this.transport.hardCancel(requestId) } catch { /* original stale reason wins */ }
      active.reject(reason)
    }

    try {
      const request = input.window.kind === 'explicit'
        ? input.window.request
        : deriveSparsePlanningWindow(input.world, input.window.options)
      const materialized = materializeSparsePlanningWindow(input.world, request)
      materializationFinishedAt = this.now()

      const afterMaterializationStale = staleIfNeeded()
      if (afterMaterializationStale) throw afterMaterializationStale
      this.currentSnapshot = {
        phase: 'running', requestId, sourceWorldVersion, error: null,
      }

      const payload: PlannerRequest = {
        algorithm: input.algorithm,
        map: materialized.document,
        options: { ...(input.plannerOptions ?? {}) },
      }
      const timeoutMs =
        materialized.request.timeoutMs ?? SPARSE_PLANNER_EXECUTION_LIMITS.defaultTimeoutMs
      const onTraceBatch = (message: TraceBatchMessage): void => {
        if (this.active !== active || active.cancelledReason || this.disposed) return
        const stale = staleIfNeeded()
        if (stale) {
          abortAsStale(stale)
          return
        }
        let worldMessage
        try {
          worldMessage = remapTraceBatchToWorld(message, materialized)
        } catch (cause) {
          if (this.active === active) {
            this.currentSnapshot = {
              phase: 'failed', requestId, sourceWorldVersion,
              error: errorSnapshot(cause),
            }
            try { this.transport.hardCancel(requestId) } catch { /* remap error wins */ }
            active.reject(cause)
          }
          return
        }
        if (this.active !== active || active.cancelledReason || active.staleReason) return
        try {
          input.onTraceBatch?.(worldMessage)
        } catch (cause) {
          const callbackError =
            sparsePlannerExecutionError('SPARSE_PLANNER_TRACE_CALLBACK_FAILED', { cause })
          if (this.active === active) {
            this.currentSnapshot = {
              phase: 'failed', requestId, sourceWorldVersion,
              error: errorSnapshot(callbackError),
            }
            try { this.transport.hardCancel(requestId) } catch { /* callback error wins */ }
            active.reject(callbackError)
          }
          return
        }
        receivedTraceBatchCount += 1
        receivedTraceEventCount += message.events.length
      }

      workerStarted = true
      const workerPromise = this.transport.request(
        payload,
        requestId,
        sourceWorldVersion,
        input.algorithm,
        onTraceBatch,
        timeoutMs,
      )
      const localResult: PlannerResult = await Promise.race([workerPromise, control])
      const afterWorkerAt = this.now()
      const completedStale = staleIfNeeded()
      if (completedStale) throw completedStale
      const result = remapPlannerResultToWorld(localResult, materialized)
      const beforeReturnStale = staleIfNeeded()
      if (beforeReturnStale) throw beforeReturnStale
      const totalFinishedAt = this.now()
      this.currentSnapshot = {
        phase: 'completed', requestId, sourceWorldVersion, error: null,
      }
      return {
        requestId,
        result,
        materialized,
        metrics: {
          requestId,
          materializationMs: nonNegativeDuration(totalStartedAt, materializationFinishedAt),
          workerMs: nonNegativeDuration(materializationFinishedAt, afterWorkerAt),
          totalMs: nonNegativeDuration(totalStartedAt, totalFinishedAt),
          sourceWorldVersion,
          width: materialized.metrics.width,
          height: materialized.metrics.height,
          cellCount: materialized.metrics.cellCount,
          obstacleCount: materialized.metrics.obstacleCount,
          terrainCount: materialized.metrics.terrainCount,
          receivedTraceBatchCount,
          receivedTraceEventCount,
        },
      }
    } catch (cause) {
      let error: unknown
      if (active.staleReason) error = active.staleReason
      else if (active.cancelledReason) error = active.cancelledReason
      else if (this.disposed) error = sparsePlannerExecutionError('SPARSE_PLANNER_DISPOSED')
      else if (cause instanceof SparsePlanningError || cause instanceof SparsePlannerExecutionError) {
        error = cause
      } else if (
        workerStarted && cause instanceof Error &&
        /超时|瓒呮椂|timeout/i.test(cause.message)
      ) {
        error = sparsePlannerExecutionError('SPARSE_PLANNER_REQUEST_TIMEOUT', { cause })
      } else if (workerStarted && cause instanceof Error) {
        error = sparsePlannerExecutionError('SPARSE_PLANNER_WORKER_FAILED', { cause })
      } else {
        error = sparsePlannerExecutionError('SPARSE_PLANNER_EXECUTION_FAILED', { cause })
      }
      if (
        workerStarted &&
        error instanceof SparsePlanningError &&
        error.code === 'SPARSE_PLANNING_WORLD_VERSION_STALE' &&
        !active.staleReason
      ) {
        active.staleReason = error
        try { this.transport.hardCancel(requestId) } catch { /* stale reason wins */ }
      }
      const phase = error instanceof SparsePlanningError &&
        error.code === 'SPARSE_PLANNING_WORLD_VERSION_STALE'
        ? 'stale'
        : error instanceof SparsePlannerExecutionError &&
          error.code === 'SPARSE_PLANNER_CANCELLED'
          ? 'cancelled'
          : 'failed'
      this.currentSnapshot = {
        phase, requestId, sourceWorldVersion, error: errorSnapshot(error),
      }
      throw error
    } finally {
      if (this.active === active) this.active = null
    }
  }

  cancel(): boolean {
    const active = this.active
    if (!active || this.disposed) return false
    const cancelled = sparsePlannerExecutionError('SPARSE_PLANNER_CANCELLED')
    active.cancelledReason = cancelled
    this.currentSnapshot = {
      phase: 'cancelled',
      requestId: active.requestId,
      sourceWorldVersion: active.sourceWorldVersion,
      error: errorSnapshot(cancelled),
    }
    try {
      this.transport.cancel(active.requestId)
      active.reject(cancelled)
    } catch (cause) {
      const error = sparsePlannerExecutionError('SPARSE_PLANNER_EXECUTION_FAILED', { cause })
      active.cancelledReason = error
      this.currentSnapshot = {
        phase: 'failed',
        requestId: active.requestId,
        sourceWorldVersion: active.sourceWorldVersion,
        error: errorSnapshot(error),
      }
      active.reject(error)
    }
    return true
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    const active = this.active
    if (active) {
      try { this.transport.hardCancel(active.requestId) } catch { /* disposal remains final */ }
      active.reject(sparsePlannerExecutionError('SPARSE_PLANNER_DISPOSED'))
      this.currentSnapshot = {
        phase: 'cancelled',
        requestId: active.requestId,
        sourceWorldVersion: active.sourceWorldVersion,
        error: errorSnapshot(sparsePlannerExecutionError('SPARSE_PLANNER_DISPOSED')),
      }
    }
    this.transport.dispose()
  }
}

export const createSparsePlannerExecutor = (
  dependencies?: Partial<SparsePlannerExecutorDependencies>,
): SparsePlannerExecutor => new SparsePlannerExecutor(dependencies)

export const sparsePlannerExecutor = new SparsePlannerExecutor({
  transport: sparsePlannerWorkerClient,
})
