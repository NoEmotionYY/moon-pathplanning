import { describe, expect, it } from 'vitest'
import { minimalSparseGridDocument } from './__fixtures__/sparseGridDocuments'
import {
  parseSparseGridJson,
  serializeSparseGridDocument,
} from './sparseGridJson'

describe('sparse grid JSON', () => {
  it('parses valid JSON and rejects malformed JSON', () => {
    const document = minimalSparseGridDocument()
    expect(parseSparseGridJson(JSON.stringify(document))).toEqual(document)
    expect(() => parseSparseGridJson('{')).toThrowError(
      expect.objectContaining({ code: 'SPARSE_MAP_JSON_INVALID' }),
    )
  })

  it('serializes pretty by default and compact on request', () => {
    const document = minimalSparseGridDocument()
    expect(serializeSparseGridDocument(document)).toContain('\n  "format"')
    expect(serializeSparseGridDocument(document, { pretty: false })).not.toContain('\n')
  })

  it('sorts obstacles and terrain deterministically by y then x', () => {
    const document = {
      ...minimalSparseGridDocument(),
      obstacles: [[5, 3], [-1, -2], [2, 3]] as const,
      terrain: [
        { point: [5, 8] as const, cost: 2 },
        { point: [-4, 4] as const, cost: 3 },
      ],
    }
    const parsed = JSON.parse(serializeSparseGridDocument(document)) as {
      obstacles: number[][]
      terrain: Array<{ point: number[] }>
    }
    expect(parsed.obstacles).toEqual([[-1, -2], [2, 3], [5, 3]])
    expect(parsed.terrain.map((cell) => cell.point)).toEqual([[-4, 4], [5, 8]])
    expect(document.obstacles).toEqual([[5, 3], [-1, -2], [2, 3]])
  })

  it('round trips deterministically', () => {
    const serialized = serializeSparseGridDocument(minimalSparseGridDocument())
    expect(serializeSparseGridDocument(parseSparseGridJson(serialized))).toBe(serialized)
  })
})
