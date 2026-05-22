# API 草案

## 核心数据结构

- `Point`：`x` 与 `y` 整数坐标。
- `GridMap`：网格尺寸、端点、障碍物和地形代价。
- `PathResult`：路径、总代价、访问节点数、展开节点数、状态与错误。
- `WeightedGraph`：节点和加权邻接边集合。

## Planner 使用方式

统一入口会按算法类型调度：

```moonbit
let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
let options = @planner.default_options()
let result = @planner.plan(map, @planner.AStar, options)
```

`PlannerOptions` 选择四方向或八方向移动，也能为 A 星算法选择启发函数。

## 算法调用示例

调用方也可以直接使用算法包：

```moonbit
let result = @algorithms.bfs(map, @grid.FourWay)
```

直接调用适合算法教学；业务入口推荐使用 Planner，以便保持返回字段一致。

## PathResult 字段

- `path`：从起点到终点的坐标数组。
- `total_cost`：最终路径代价。
- `visited_nodes`：首次进入 frontier 的节点数。
- `expanded_nodes`：从 frontier 取出并处理的节点数。
- `status`：找到路径、无路径或非法输入。
- `error`：非法输入时的错误描述。

## 地图 JSON 格式

示例地图使用稳定的 v1 schema：

```json
{
  "width": 6,
  "height": 5,
  "start": [0, 0],
  "goal": [5, 4],
  "movement": "four_way",
  "obstacles": [[1, 1], [1, 2]],
  "terrain": [{"point": [3, 2], "cost": 4.0}]
}
```

初版 MoonBit 模块提供 schema 对应序列化能力和示例文件。完整 JSON 文件解析需要在
可用 MoonBit 工具链与 JSON 依赖边界下继续验证。

