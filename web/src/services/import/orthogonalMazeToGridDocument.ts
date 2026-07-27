import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import {
  GRID_CONVERSION_CODES,
  resolveOrthogonalGridConversionOptions,
} from '@/config/orthogonalGridConversion'
import type {
  OrthogonalGridConversionOptions,
} from '@/config/orthogonalGridConversion'
import type {
  EntranceCandidate,
  EntrancePairCandidate,
  EntranceSelectionResult,
} from '@/types/mazeEntrances'
import type { OrthogonalMazeTopology } from '@/types/mazeTopology'
import type { OrthogonalMazeDetection } from '@/types/orthogonalMaze'
import type {
  GridCoordinate,
  OrthogonalGridConversionResult,
} from '@/types/orthogonalGridConversion'
import { validateGridDocument } from '@/utils/validation'
import { validateConvertedGrid } from './convertedGridValidation'
import { mapEntranceCandidateToGrid } from './entranceGridMapper'
import { GridConversionError } from './gridConversionError'
import { buildGridMapDocumentFromOccupancy } from './gridMapDocumentBuilder'
import {
  createBlockedGrid,
  openMazeCellCenters,
  openMazePassages,
  setGridWalkable,
} from './orthogonalGridBuilder'
import { getConvertedGridDimensions } from './orthogonalGridCoordinates'

export interface OrthogonalMazeToGridInput {
  detection: OrthogonalMazeDetection
  topology: OrthogonalMazeTopology
  entranceSelection: EntranceSelectionResult
  manualPair?: {
    firstCandidateId: string
    secondCandidateId: string
  }
  options?: Partial<OrthogonalGridConversionOptions>
}

const failure = (
  code: string,
  message: string,
  warnings: string[] = [],
): OrthogonalGridConversionResult => ({
  success: false,
  document: null,
  startSource: null,
  goalSource: null,
  startMapping: null,
  goalMapping: null,
  cellMappings: [],
  metrics: null,
  warnings: [...new Set(warnings)],
  error: { code, message },
})

const selectionErrorCode = (
  selection: EntranceSelectionResult,
): string => {
  if (selection.status === 'ambiguous') {
    return GRID_CONVERSION_CODES.entrancePairAmbiguous
  }
  if (selection.status === 'disconnected') {
    return GRID_CONVERSION_CODES.entrancePairDisconnected
  }
  if (selection.status === 'low-confidence') {
    return GRID_CONVERSION_CODES.entrancePairLowConfidence
  }
  return GRID_CONVERSION_CODES.entrancePairRequired
}

const findCandidate = (
  candidates: EntranceCandidate[],
  id: string,
): EntranceCandidate | undefined =>
  candidates.find((candidate) => candidate.id === id)

const resolvePair = (
  input: OrthogonalMazeToGridInput,
  options: OrthogonalGridConversionOptions,
): EntrancePairCandidate | null => {
  const manual = input.manualPair
  if (!manual) {
    return input.entranceSelection.status === 'selected'
      ? input.entranceSelection.selectedPair
      : null
  }
  if (
    manual.firstCandidateId === manual.secondCandidateId
  ) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '手动入口对不能使用同一个候选。',
    )
  }
  const first = findCandidate(
    input.entranceSelection.candidates,
    manual.firstCandidateId,
  )
  const second = findCandidate(
    input.entranceSelection.candidates,
    manual.secondCandidateId,
  )
  if (!first || !second) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '手动入口对必须来自现有候选。',
    )
  }
  const pair = input.entranceSelection.pairCandidates.find((candidate) =>
    (candidate.first.id === first.id &&
      candidate.second.id === second.id) ||
    (candidate.first.id === second.id &&
      candidate.second.id === first.id))
  if (!pair) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entranceInvalid,
      '手动入口对没有对应的已分析候选对。',
    )
  }
  if (!pair.connected || !pair.sameComponent) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entrancePairDisconnected,
      '手动入口对不在同一连通分量。',
    )
  }
  if (
    !options.allowLowConfidenceManualPair &&
    (first.state !== 'reliable' || second.state !== 'reliable')
  ) {
    throw new GridConversionError(
      GRID_CONVERSION_CODES.entrancePairLowConfidence,
      '手动入口对置信度不足。',
    )
  }
  return {
    ...pair,
    first,
    second,
  }
}

const pointKey = (point: GridCoordinate): string =>
  `${point.x},${point.y}`

export function convertOrthogonalMazeToGridDocument(
  input: OrthogonalMazeToGridInput,
): OrthogonalGridConversionResult {
  let options: OrthogonalGridConversionOptions
  try {
    options = resolveOrthogonalGridConversionOptions(input.options)
  } catch (error) {
    return failure(
      GRID_CONVERSION_CODES.documentInvalid,
      error instanceof Error ? error.message : '转换配置无效。',
    )
  }
  const { detection, topology, entranceSelection } = input
  if (!detection.detected) {
    return failure(
      GRID_CONVERSION_CODES.orthogonalDetectionRequired,
      '必须先完成可靠的正交迷宫检测。',
    )
  }
  if (
    !topology.analyzed ||
    topology.rows !== detection.rows ||
    topology.columns !== detection.columns
  ) {
    return failure(
      GRID_CONVERSION_CODES.topologyRequired,
      '必须先完成与检测结果一致的正交拓扑分析。',
    )
  }

  let pair: EntrancePairCandidate | null
  try {
    pair = resolvePair(input, options)
  } catch (error) {
    if (error instanceof GridConversionError) {
      return failure(error.code, error.message)
    }
    return failure(
      GRID_CONVERSION_CODES.entranceInvalid,
      '入口对解析失败。',
    )
  }
  if (!pair) {
    const code = selectionErrorCode(entranceSelection)
    return failure(code, '当前入口选择状态不能自动生成地图文档.')
  }
  if (
    !pair.connected ||
    !pair.sameComponent ||
    (options.requireSelectedEntrancePair &&
      !input.manualPair &&
      entranceSelection.status !== 'selected')
  ) {
    return failure(
      GRID_CONVERSION_CODES.entrancePairDisconnected,
      '入口对必须位于同一连通分量。',
    )
  }

  let dimensions: { width: number; height: number }
  try {
    dimensions = getConvertedGridDimensions(
      topology.rows,
      topology.columns,
    )
  } catch (error) {
    return failure(
      GRID_CONVERSION_CODES.sizeTooSmall,
      error instanceof Error ? error.message : '转换尺寸无效。',
    )
  }
  if (
    dimensions.width < MAP_SIZE_LIMITS.min ||
    dimensions.height < MAP_SIZE_LIMITS.min
  ) {
    return failure(
      GRID_CONVERSION_CODES.sizeTooSmall,
      '转换后的地图尺寸低于统一下限。',
    )
  }
  if (
    dimensions.width > MAP_SIZE_LIMITS.hardMax ||
    dimensions.height > MAP_SIZE_LIMITS.hardMax
  ) {
    return failure(
      GRID_CONVERSION_CODES.sizeExceeded,
      '转换后的地图尺寸超过统一硬上限。',
    )
  }
  const warnings: string[] = []
  if (
    dimensions.width > MAP_SIZE_LIMITS.recommendedMax ||
    dimensions.height > MAP_SIZE_LIMITS.recommendedMax
  ) {
    warnings.push(GRID_CONVERSION_CODES.largeMap)
  }

  try {
    const grid = createBlockedGrid(dimensions.width, dimensions.height)
    const cellMappings = openMazeCellCenters(
      grid,
      topology.rows,
      topology.columns,
    )
    const passagePoints = openMazePassages(
      grid,
      topology.rows,
      topology.columns,
      topology.adjacencyEdges,
    )
    if (passagePoints.length < topology.adjacencyEdges.length) {
      warnings.push(GRID_CONVERSION_CODES.duplicateEdge)
    }
    const startMapping = mapEntranceCandidateToGrid(
      pair.first,
      topology.rows,
      topology.columns,
    )
    const goalMapping = mapEntranceCandidateToGrid(
      pair.second,
      topology.rows,
      topology.columns,
    )
    const pointsToOpen = options.openOuterBoundary
      ? [
          ...startMapping.openedBoundaryPoints,
          ...goalMapping.openedBoundaryPoints,
        ]
      : [startMapping.boundaryPoint, goalMapping.boundaryPoint]
    const uniqueOuterPoints = new Map<string, GridCoordinate>()
    for (const point of pointsToOpen) {
      uniqueOuterPoints.set(pointKey(point), point)
    }
    uniqueOuterPoints.set(
      pointKey(startMapping.boundaryPoint),
      startMapping.boundaryPoint,
    )
    uniqueOuterPoints.set(
      pointKey(goalMapping.boundaryPoint),
      goalMapping.boundaryPoint,
    )
    for (const point of uniqueOuterPoints.values()) {
      setGridWalkable(grid, point)
    }
    const document = buildGridMapDocumentFromOccupancy(
      grid,
      startMapping.boundaryPoint,
      goalMapping.boundaryPoint,
    )
    try {
      validateGridDocument(document, {
        maximumSize: MAP_SIZE_LIMITS.hardMax,
      })
    } catch (error) {
      return failure(
        GRID_CONVERSION_CODES.documentInvalid,
        error instanceof Error ? error.message : '地图文档校验失败。',
        warnings,
      )
    }
    const validation = validateConvertedGrid(document)
    warnings.push(...validation.warnings)
    if (!validation.valid) {
      return failure(
        GRID_CONVERSION_CODES.startGoalDisconnected,
        '转换后的起点和终点不连通。',
        warnings,
      )
    }
    const totalGridCells = dimensions.width * dimensions.height
    const obstacleCells = document.obstacles.length
    const walkableCells = totalGridCells - obstacleCells
    const expectedWalkableCells =
      cellMappings.length +
      passagePoints.length +
      uniqueOuterPoints.size
    if (walkableCells !== expectedWalkableCells) {
      return failure(
        GRID_CONVERSION_CODES.walkableCountMismatch,
        '转换后的可通行格数量与理论值不一致。',
        warnings,
      )
    }
    return {
      success: true,
      document,
      startSource: pair.first,
      goalSource: pair.second,
      startMapping,
      goalMapping,
      cellMappings,
      metrics: {
        rows: topology.rows,
        columns: topology.columns,
        gridWidth: dimensions.width,
        gridHeight: dimensions.height,
        totalGridCells,
        obstacleCells,
        walkableCells,
        logicalCellCenters: cellMappings.length,
        openPassageCells: passagePoints.length,
        openedOuterBoundaryCells: uniqueOuterPoints.size,
        expectedWalkableCells,
      },
      warnings: [...new Set(warnings)],
    }
  } catch (error) {
    if (error instanceof GridConversionError) {
      return failure(error.code, error.message, warnings)
    }
    return failure(
      GRID_CONVERSION_CODES.documentInvalid,
      error instanceof Error ? error.message : '正交迷宫转换失败。',
      warnings,
    )
  }
}
