import type { MazeImportError, MazeSourceFileType } from '@/types/import'
import { IMPORT_FILE_SIZE_LIMITS } from '@/config/importLimits'
import {
  detectImportFileType,
  type FileTypeDetection,
  type ImportFileMetadata,
} from './fileTypeDetector'

export const IMPORT_VALIDATION_ERROR_CODES = {
  emptyFile: '文件为空',
  fileTooLarge: '文件过大',
  typeMismatch: '文件类型冲突',
  unsupportedType: '不支持的文件类型',
} as const

export interface ImportFileCandidate extends ImportFileMetadata {
  size: number
}

const formatBytes = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024)
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`
}

export interface ImportFileValidationResult {
  valid: boolean
  fileType: MazeSourceFileType
  detection: FileTypeDetection
  error?: MazeImportError
}

const invalid = (
  detection: FileTypeDetection,
  code: string,
  message: string,
): ImportFileValidationResult => ({
  valid: false,
  fileType: detection.fileType,
  detection,
  error: { code, message },
})

export const validateImportFile = (
  file: ImportFileCandidate,
): ImportFileValidationResult => {
  const detection = detectImportFileType(file)

  if (file.size === 0) {
    return invalid(
      detection,
      IMPORT_VALIDATION_ERROR_CODES.emptyFile,
      '所选文件为空，请选择包含内容的迷宫文件。',
    )
  }
  if (detection.conflict) {
    return invalid(
      detection,
      IMPORT_VALIDATION_ERROR_CODES.typeMismatch,
      '文件扩展名与 MIME 类型不一致，请检查文件是否正确。',
    )
  }
  if (detection.fileType === 'unsupported') {
    return invalid(
      detection,
      IMPORT_VALIDATION_ERROR_CODES.unsupportedType,
      '暂不支持该文件类型，请选择 JSON、PNG、JPEG、WebP、SVG 或 PDF 文件。',
    )
  }
  const maxBytes = IMPORT_FILE_SIZE_LIMITS[detection.fileType]
  if (file.size > maxBytes) {
    return invalid(
      detection,
      IMPORT_VALIDATION_ERROR_CODES.fileTooLarge,
      `${detection.fileType.toUpperCase()} 文件不能超过 ${formatBytes(maxBytes)}。`,
    )
  }

  return {
    valid: true,
    fileType: detection.fileType,
    detection,
  }
}
