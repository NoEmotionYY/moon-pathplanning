import type {
  MazeImportPipelineStage,
  MazeImportPipelineWarning,
} from '@/types/mazeImportPipeline'

export interface PipelineWarningSource {
  stage: MazeImportPipelineStage
  warnings: readonly string[]
}

const WARNING_MESSAGES: Readonly<Record<string, string>> = {
  ENTRANCE_NO_OPENING: '未检测到可用入口。',
  ENTRANCE_SINGLE_OPENING: '只检测到一个可用入口。',
  ENTRANCE_MULTIPLE_OPENINGS: '检测到多个入口，需要手动选择。',
  ENTRANCE_PAIR_AMBIGUOUS: '入口候选对不唯一，需要手动选择。',
  ENTRANCE_PAIR_DISCONNECTED: '入口候选不在同一连通区域。',
  ENTRANCE_PAIR_LOW_CONFIDENCE: '入口候选对置信度不足。',
  ORTHOGONAL_CONFIDENCE_LOW: '正交迷宫结构置信度不足。',
  HORIZONTAL_GRID_NOT_DETECTED: '未可靠检测到水平格线。',
  VERTICAL_GRID_NOT_DETECTED: '未可靠检测到垂直格线。',
  GRID_CONVERSION_LARGE_MAP: '转换后的地图超过推荐尺寸。',
  IMPORT_PROGRESS_CALLBACK_FAILED: '进度回调执行失败，分析已继续。',
}

export function createPipelineWarning(
  code: string,
  stage: MazeImportPipelineStage,
  message = WARNING_MESSAGES[code] ?? code,
): MazeImportPipelineWarning {
  return { code, message, stage }
}

export function collectPipelineWarnings(
  ...sources: PipelineWarningSource[]
): MazeImportPipelineWarning[] {
  const result: MazeImportPipelineWarning[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    for (const code of source.warnings) {
      const warning = createPipelineWarning(code, source.stage)
      const key = `${warning.stage}\u0000${warning.code}\u0000${warning.message}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(warning)
      }
    }
  }
  return result
}
