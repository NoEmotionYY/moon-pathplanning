# Moon PathPlanning

Moon PathPlanning is a reusable MoonBit path planning library for grid search,
graph primitives, examples, tests, CLI demos, and SVG output.

## 项目简介

项目面向机器人路径规划、游戏地图寻路、网格导航、算法教学和确定性仿真。初版先
交付二维网格地图、统一结果模型和可审查的经典搜索算法，为后续增量规划和采样规划
保留可复用边界。

## 项目背景与引用

本项目参考 `zhm-real/PathPlanning` 的路径规划主题、算法思想和案例方向。参考项目
采用 MIT License；本仓库同样使用 MIT License，并在 MoonBit 原生包结构中重新组织
数据模型、测试、Planner 和可视化能力，不直接照搬 Python 脚本式实现。

## 功能列表

- `Point` / `Coord`、搜索状态、搜索错误和统一 `PathResult`。
- `GridMap`、四方向和八方向移动、障碍物、terrain cost 与合法性检查。
- `WeightedGraph` 加权节点和边接口。
- Manhattan、Euclidean、Chebyshev 与 Octile 启发函数。
- BFS、DFS、Dijkstra、A 星和双向 A 星搜索。
- Planner 算法调度、JSON v1 示例和序列化、SVG 导出、CLI demo。

## 当前完成情况

初步工程已包含源码、测试文件、示例地图、文档、CI 和 benchmark 说明。JSON v1 当前
提供 schema、示例地图和序列化；完整 JSON 文件解析仍需在确定 MoonBit JSON 依赖后
补齐。CLI v1 使用内置 demo 地图，文件参数解析与 benchmark runner 属于后续工作。

## 快速开始

先安装 MoonBit 工具链，再在仓库根目录执行：

```bash
moon check
moon test
moon run cli
```

当前 CLI 会运行内置 A 星示例并打印路径节点数、总代价、访问节点数和展开节点数。

## 示例地图格式

`examples/simple_grid.json` 与 `examples/weighted_grid.json` 使用
`moon-pathplanning.grid.v1` schema：

```json
{
  "format": "moon-pathplanning.grid.v1",
  "width": 6,
  "height": 5,
  "start": [0, 0],
  "goal": [5, 4],
  "movement": "four_way",
  "obstacles": [[1, 1], [1, 2]],
  "terrain": [{"point": [3, 2], "cost": 4.0}]
}
```

## API 示例

```moonbit
let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  .with_obstacles([@core.point(2, 1), @core.point(2, 2)])
let result = @planner.plan(map, @planner.AStar, @planner.default_options())
```

直接算法调用适合教学，Planner 适合统一业务入口。`PathResult` 包含路径、总代价、
访问节点数、展开节点数、状态和错误字段；更多说明见 `docs/api.md`。

## 测试方式

MoonBit 测试位于 `test/`，覆盖最短路径、无路径、障碍绕行、权重地图、三类算法
一致性、移动模式、起点等于终点和非法地图输入。标准检查命令是 `moon check` 与
`moon test`。

## 可视化说明

`src/visualize/svg_exporter.mbt` 会导出网格、起点、终点、障碍物和最终路径的 SVG
字符串。调用方可将字符串写入展示层或示例文件，仓库不提交大量生成图片。

## 开发路线

- 第一阶段：基础工程、地图模型和五类搜索算法。
- 第二阶段：JSON、CLI、SVG 和 benchmark 完善。
- 第三阶段：LPA*、D* Lite、RRT、RRT-Connect 与 RRT*。
- 第四阶段：mooncakes.io 发布与 MoonBit 生态适配。

详细设计、迁移说明与路线图见 `docs/`。

## License

This project is released under the MIT License. See `LICENSE`.
