import { PlannerWorkerClient } from '@/services/plannerWorkerClient'

export function createSparsePlannerWorkerClient(
  workerFactory?: () => Worker,
): PlannerWorkerClient {
  return workerFactory === undefined
    ? new PlannerWorkerClient()
    : new PlannerWorkerClient(workerFactory)
}

export const sparsePlannerWorkerClient = createSparsePlannerWorkerClient()
