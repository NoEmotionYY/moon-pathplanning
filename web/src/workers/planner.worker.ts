/// <reference lib="webworker" />
import { plan_json } from '@/generated/moonbit_bridge.js'
import { parsePlannerResult } from '@/services/moonbitPlanner'
import type {
  PlannerWorkerMessage,
  PlannerWorkerResponse,
  TraceBatchMessage,
} from '@/types/planner'

const cancelledRequests = new Set<string>()
const TRACE_BATCH_SIZE = 100

const send = (response: PlannerWorkerResponse) => self.postMessage(response)

self.addEventListener('message', (event: MessageEvent<PlannerWorkerMessage>) => {
  if (event.data.type === 'cancel') {
    cancelledRequests.add(event.data.requestId)
    send({ type: 'run-cancelled', requestId: event.data.requestId })
    return
  }

  const { requestId, payload } = event.data
  cancelledRequests.delete(requestId)
  send({ type: 'run-started', requestId })
  try {
    const result = parsePlannerResult(plan_json(JSON.stringify(payload)))
    if (cancelledRequests.has(requestId)) {
      send({ type: 'run-cancelled', requestId })
      return
    }

    const trace = result.trace!
    if (!trace.supported || trace.events.length === 0) {
      send({
        type: 'trace-batch',
        requestId,
        events: [],
        offset: 0,
        done: true,
        supported: trace.supported,
        mode: trace.mode,
        totalSteps: trace.totalSteps,
      })
    } else {
      for (let offset = 0; offset < trace.events.length; offset += TRACE_BATCH_SIZE) {
        if (cancelledRequests.has(requestId)) {
          send({ type: 'run-cancelled', requestId })
          return
        }
        const batch: TraceBatchMessage = {
          type: 'trace-batch',
          requestId,
          events: trace.events.slice(offset, offset + TRACE_BATCH_SIZE),
          offset,
          done: offset + TRACE_BATCH_SIZE >= trace.events.length,
          supported: true,
          mode: 'recorded',
          totalSteps: trace.totalSteps,
        }
        send(batch)
      }
    }
    send({
      type: 'run-completed',
      requestId,
      result: { ...result, trace: { ...trace, events: [] } },
    })
  } catch (error) {
    send({
      type: 'run-failed',
      requestId,
      error: {
        code: 'BRIDGE_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'MoonBit 规划调用失败',
      },
    })
  }
})
