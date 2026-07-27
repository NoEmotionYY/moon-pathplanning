import type { MazeSourceFileType } from '@/types/import'

export interface ImportFileMetadata {
  name: string
  type: string
}

export interface FileTypeDetection {
  fileType: MazeSourceFileType
  extensionType: MazeSourceFileType
  mimeType: MazeSourceFileType
  normalizedMime: string
  conflict: boolean
}

const EXTENSION_TYPES: Readonly<Record<string, MazeSourceFileType>> = {
  json: 'json',
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  webp: 'webp',
  svg: 'svg',
  pdf: 'pdf',
}

const MIME_TYPES: Readonly<Record<string, MazeSourceFileType>> = {
  'application/json': 'json',
  'text/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
}

const typeFromExtension = (name: string): MazeSourceFileType => {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex < 0 || dotIndex === name.length - 1) return 'unsupported'
  return EXTENSION_TYPES[name.slice(dotIndex + 1).toLowerCase()] ?? 'unsupported'
}

const normalizeMime = (mime: string): string =>
  mime.split(';', 1)[0]?.trim().toLowerCase() ?? ''

const isUnknownMime = (mime: string): boolean =>
  mime === '' || mime === 'application/octet-stream'

export const detectImportFileType = (
  file: ImportFileMetadata,
): FileTypeDetection => {
  const extensionType = typeFromExtension(file.name.trim())
  const normalizedMime = normalizeMime(file.type)
  const mimeType = isUnknownMime(normalizedMime)
    ? 'unsupported'
    : MIME_TYPES[normalizedMime] ?? 'unsupported'
  const conflict =
    extensionType !== 'unsupported' &&
    mimeType !== 'unsupported' &&
    extensionType !== mimeType

  return {
    fileType: conflict
      ? 'unsupported'
      : mimeType !== 'unsupported'
        ? mimeType
        : extensionType,
    extensionType,
    mimeType,
    normalizedMime,
    conflict,
  }
}
