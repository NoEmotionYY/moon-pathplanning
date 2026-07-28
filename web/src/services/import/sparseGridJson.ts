import type { SparseGridDocument } from '@/types/sparseGridDocument'
import { sparseDocumentError } from './sparseGridDocumentError'
import { validateSparseGridDocument } from './validateSparseGridDocument'

const byYThenX = (
  left: readonly [number, number],
  right: readonly [number, number],
): number => left[1] - right[1] || left[0] - right[0]

export const parseSparseGridJson = (text: string): SparseGridDocument => {
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    throw sparseDocumentError('SPARSE_MAP_JSON_INVALID')
  }
  return validateSparseGridDocument(value)
}

export const serializeSparseGridDocument = (
  document: SparseGridDocument,
  options: { pretty?: boolean } = {},
): string => {
  const valid = validateSparseGridDocument(document)
  const sorted: SparseGridDocument = {
    ...valid,
    obstacles: [...valid.obstacles].sort(byYThenX),
    terrain: [...valid.terrain].sort((left, right) => byYThenX(left.point, right.point)),
  }
  return JSON.stringify(sorted, null, options.pretty ?? true ? 2 : undefined)
}
