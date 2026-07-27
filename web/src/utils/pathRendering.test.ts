import { shouldShowFinalPath } from './pathRendering'

describe('最终路径显示策略', () => {
  const state = {
    hasPath: true,
    traceSupported: true,
    traceTotalSteps: 10,
    playbackStatus: 'playing' as const,
    showDuringTrace: false,
  }

  it('真实追踪播放期间默认隐藏，完成后显示', () => {
    expect(shouldShowFinalPath(state)).toBe(false)
    expect(shouldShowFinalPath({ ...state, playbackStatus: 'finished' })).toBe(true)
  })

  it('不支持追踪的算法仍显示最终路径', () => {
    expect(shouldShowFinalPath({ ...state, traceSupported: false })).toBe(true)
  })
})
