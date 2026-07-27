import {
  ENTRANCE_DETECTION_WEIGHTS,
  ENTRANCE_WARNING_CODES,
  resolveEntranceDetectionOptions,
} from '@/config/entranceDetection'
import type { EntranceDetectionOptions } from '@/config/entranceDetection'
import type {
  EntranceCandidate,
  EntrancePairCandidate,
} from '@/types/mazeEntrances'
import type {
  MazeCell,
  OrthogonalMazeTopology,
} from '@/types/mazeTopology'
import { buildAdjacencyLists } from './mazeAdjacencyBuilder'

const cellIndex = (cell: MazeCell, columns: number): number =>
  cell.row * columns + cell.column

const inRange = (
  cell: MazeCell,
  rows: number,
  columns: number,
): boolean =>
  cell.row >= 0 &&
  cell.row < rows &&
  cell.column >= 0 &&
  cell.column < columns

const buildDistances = (
  start: number,
  adjacency: number[][],
): Int32Array => {
  const distances = new Int32Array(adjacency.length)
  distances.fill(-1)
  if (start < 0 || start >= adjacency.length) {
    return distances
  }
  const queue = new Int32Array(adjacency.length)
  let head = 0
  let tail = 0
  queue[tail] = start
  tail += 1
  distances[start] = 0
  while (head < tail) {
    const current = queue[head] ?? 0
    head += 1
    for (const neighbor of adjacency[current] ?? []) {
      if ((distances[neighbor] ?? -1) < 0) {
        distances[neighbor] = (distances[current] ?? 0) + 1
        queue[tail] = neighbor
        tail += 1
      }
    }
  }
  return distances
}

export function buildEntrancePairCandidates(
  candidates: EntranceCandidate[],
  topology: OrthogonalMazeTopology,
  options: Partial<EntranceDetectionOptions> = {},
): EntrancePairCandidate[] {
  const resolved = resolveEntranceDetectionOptions(options)
  if (!topology.analyzed) {
    return []
  }
  const eligible = candidates
    .filter((candidate) => candidate.state !== 'invalid')
    .sort((left, right) => left.id.localeCompare(right.id))
  if (eligible.length < 2) {
    return []
  }

  const adjacency = buildAdjacencyLists(
    topology.rows,
    topology.columns,
    topology.adjacencyEdges,
  )
  const distanceByStart = new Map<number, Int32Array>()
  const getDistances = (candidate: EntranceCandidate): Int32Array => {
    const start = inRange(
      candidate.interiorCell,
      topology.rows,
      topology.columns,
    )
      ? cellIndex(candidate.interiorCell, topology.columns)
      : -1
    const existing = distanceByStart.get(start)
    if (existing) {
      return existing
    }
    const distances = buildDistances(start, adjacency)
    distanceByStart.set(start, distances)
    return distances
  }

  const pairs: EntrancePairCandidate[] = []
  for (let firstIndex = 0; firstIndex < eligible.length; firstIndex += 1) {
    const first = eligible[firstIndex]
    if (!first) {
      continue
    }
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < eligible.length;
      secondIndex += 1
    ) {
      const second = eligible[secondIndex]
      if (!second) {
        continue
      }
      const target = inRange(
        second.interiorCell,
        topology.rows,
        topology.columns,
      )
        ? cellIndex(second.interiorCell, topology.columns)
        : -1
      const distance = target >= 0
        ? (getDistances(first)[target] ?? -1)
        : -1
      const graphDistance = distance >= 0 ? distance : null
      const connected = graphDistance !== null
      const sameComponent =
        first.componentId !== null &&
        first.componentId === second.componentId
      const boundaryDistance = Math.hypot(
        first.centerPixel.x - second.centerPixel.x,
        first.centerPixel.y - second.centerPixel.y,
      )
      const warnings: string[] = []
      if (!connected || !sameComponent) {
        warnings.push(ENTRANCE_WARNING_CODES.pairDisconnected)
      }
      const connectedGate =
        connected && sameComponent
          ? 1
          : ENTRANCE_DETECTION_WEIGHTS.disconnectedPairGate
      const confidence = Math.max(
        0,
        Math.min(
          1,
          Math.sqrt(first.confidence * second.confidence) *
            connectedGate,
        ),
      )
      if (confidence < resolved.minimumAutomaticPairConfidence) {
        warnings.push(ENTRANCE_WARNING_CODES.pairLowConfidence)
      }
      pairs.push({
        first,
        second,
        connected,
        sameComponent,
        graphDistance,
        boundaryDistance,
        confidence,
        warnings: [...new Set(warnings)],
      })
    }
  }

  return pairs.sort((left, right) =>
    Number(right.connected) - Number(left.connected) ||
    right.confidence - left.confidence ||
    left.first.id.localeCompare(right.first.id) ||
    left.second.id.localeCompare(right.second.id),
  )
}
