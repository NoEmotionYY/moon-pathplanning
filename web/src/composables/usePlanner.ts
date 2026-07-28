import { onBeforeUnmount } from 'vue'
import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { plannerWorkerClient } from '@/services/plannerWorkerClient'
import { useToast } from './useToast'

export const usePlanner = () => {
  const grid = useGridStore()
  const planner = usePlannerStore()
  const toast = useToast()

  const run = async () => {
    if (planner.isRunning) return

    const requestId = crypto.randomUUID()
    const mapVersion = grid.version
    const algorithm = planner.selectedAlgorithm
    const startedAt = performance.now()
    if (!planner.begin(requestId, mapVersion, algorithm)) return

    try {
      const result = await plannerWorkerClient.request(
        {
          algorithm,
          map: grid.toDocument(),
          options: {},
        },
        requestId,
        mapVersion,
        algorithm,
        (batch) => planner.appendTraceBatch(batch, mapVersion, algorithm),
      )
      const accepted = planner.complete(
        requestId,
        result,
        performance.now() - startedAt,
        mapVersion,
        algorithm,
      )
      if (!accepted) return

      if (result.status === 'found') toast.show('路径规划完成', 'success')
      else if (result.status === 'no_path') toast.show('当前地图没有可行路径', 'error')
      else toast.show(result.error?.message ?? '地图输入无效', 'error')
    } catch (error) {
      const message = error instanceof Error ? error.message : '路径规划执行失败'
      if (planner.fail(requestId, { code: 'WORKER_ERROR', message })) {
        toast.show(message, 'error')
      }
    }
  }

  const cancel = () => {
    const requestId = planner.currentRequestId
    if (!requestId) return
    planner.cancelRequest(requestId)
    plannerWorkerClient.cancel(requestId)
  }

  onBeforeUnmount(cancel)

  return { run, cancel }
}
