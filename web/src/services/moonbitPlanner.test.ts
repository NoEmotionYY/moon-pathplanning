import { parsePlannerResult } from './moonbitPlanner'

describe('Planner 返回值解析', () => {
  const result = {
    success: true,
    status: 'found',
    algorithm: 'astar',
    movement: 'four_way',
    path: [[0, 0], [1, 0]],
    pathNodes: 2,
    totalCost: 1,
    visitedNodes: 3,
    expandedNodes: 2,
    iterations: null,
    treeNodes: null,
    trace: {
      supported: true,
      mode: 'recorded',
      totalSteps: 1,
      events: [
        {
          step: 0,
          kind: 'discovered',
          point: [0, 0],
          frontierSize: 1,
          source: null,
        },
      ],
    },
    error: null,
  }

  it('接受字段完整的结构化结果与记录事件', () => {
    expect(parsePlannerResult(JSON.stringify(result))).toEqual(result)
  })

  it('拒绝非法 JSON、缺失字段和非法事件', () => {
    expect(() => parsePlannerResult('{bad')).toThrow('无法解析')
    expect(() => parsePlannerResult('{"success":true}')).toThrow('字段不完整')
    const invalid = structuredClone(result)
    invalid.trace.events[0]!.kind = 'unknown'
    expect(() => parsePlannerResult(JSON.stringify(invalid))).toThrow('搜索事件')
  })
})
