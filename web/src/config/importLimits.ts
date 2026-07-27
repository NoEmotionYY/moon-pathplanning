export const IMPORT_FILE_SIZE_LIMITS = {
  json: 1 * 1024 * 1024,
  png: 10 * 1024 * 1024,
  jpeg: 10 * 1024 * 1024,
  webp: 10 * 1024 * 1024,
  svg: 3 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
} as const

export const IMPORT_IMAGE_LIMITS = {
  maxWidth: 8192,
  maxHeight: 8192,
  maxPixels: 32_000_000,
} as const
