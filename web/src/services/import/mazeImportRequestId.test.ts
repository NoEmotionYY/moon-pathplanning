import { beforeEach, describe, expect, it } from 'vitest'
import {
  createMazeImportRequestId,
  resetMazeImportRequestIdCounterForTests,
} from './mazeImportRequestId'

describe('createMazeImportRequestId', () => {
  beforeEach(resetMazeImportRequestIdCounterForTests)

  it('相同时间仍通过页面级计数器保持唯一', () => {
    expect(createMazeImportRequestId(() => 1234))
      .toBe('maze-import-1234-1')
    expect(createMazeImportRequestId(() => 1234))
      .toBe('maze-import-1234-2')
  })

  it('不包含文件路径或候选 ID', () => {
    expect(createMazeImportRequestId(() => 99))
      .toMatch(/^maze-import-99-\d+$/)
  })
})
