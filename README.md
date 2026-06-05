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
- `GridMap`、四方向和八方向移动、障碍物、障碍物膨胀、terrain cost 与合法性检查。
- `WeightedGraph` 加权节点和边接口。
- Manhattan、Euclidean、Chebyshev 与 Octile 启发函数。
- BFS、DFS、Dijkstra、A 星和双向 A 星搜索。
- 区域搜索预处理：障碍物边界角识别、候选搜索区域生成和空地图自由区域回退。
- RS-APSO 基础组件：路径长度/平滑度适应度、固定 seed 随机源、自适应参数、PSO/RS-APSO 主循环。
- 动态避障基础组件：碰撞半径、移动障碍物碰撞检测、速度方向预测、边界往复预测、连续坐标时间预测、连续轨迹安全评估、连续碰撞诊断报告、连续轨迹最小安全间距评估和跳跃避障路径修正。
- Planner 算法调度，包含经典搜索、基础 PSO 和 RS-APSO；JSON v1 示例、序列化和字符串解析、SVG 导出、CLI demo，以及支持 JSON 文件和 JSON 字符串输入的 benchmark runner。

## 当前完成情况

初步工程已包含源码、测试文件、示例地图、文档、CI 和 benchmark 说明，并已按论文方向
开始补充区域搜索、swarm 基础模块和动态避障模块，其中 PSO/RS-APSO 已能在区域候选点中
搜索中间路点并用 A 星拼接可行路径。JSON v1 当前提供 schema、示例地图、序列化和
字符串解析入口。CLI v1 支持内置 demo 地图、`--json` 字符串输入，也支持 native 后端读取 JSON 地图文件；
`bench` runner 已固定两个 20x20 RS-APSO 场景和两个动态避障场景，并以 5 次重复输出
CSV 指标和耗时统计；runner 也支持 `--json` 字符串输入，native 后端还可读取 JSON v1 地图文件运行同格式 benchmark。

## 快速开始

先安装 MoonBit 工具链，再在仓库根目录执行：

```bash
moon check
moon test
moon run cli
moon run cli -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run cli --target native -- examples/simple_grid.json
moon run ./bench
moon run ./bench -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run ./bench --target native -- examples/simple_grid.json
```

当前 CLI 会运行内置 A 星示例并打印路径节点数、总代价、访问节点数和展开节点数。
字符串型 JSON 输入使用 `--json/-j`，不依赖文件读取；PowerShell 中需要像上面的示例一样转义 JSON 双引号。
文件型 JSON 输入需要 native 后端，命令形如
`moon run cli --target native -- --map examples/weighted_grid.json`。
benchmark runner 会对 20x20 simple/complex 场景输出 A 星、Dijkstra、PSO 和 RS-APSO
的路径长度、平滑度、访问/展开节点数、迭代次数、候选数量、最终适应度、swarm 参数、
重复次数和总/平均耗时；同时输出 `dynamic_5x1` 和 `dynamic_10x10_crossing` 下静态 A 星基线、
整数速度动态修正、边界往复修正和连续坐标时间步修正的同格式 CSV 行。文件型 benchmark 输入需要 native
后端，命令形如 `moon run ./bench --target native -- --map examples/weighted_grid.json`。

## 示例地图格式

`examples/simple_grid.json` 与 `examples/weighted_grid.json` 使用
`moon-pathplanning.grid.v1` schema；`examples/rs_apso_20x20_simple.json` 与
`examples/rs_apso_20x20_complex.json` 固定 20x20 RS-APSO benchmark 输入：

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
一致性、移动模式、起点等于终点、非法地图输入、JSON 字符串解析、区域搜索、
RS-APSO 基础能力和动态避障，包含整数栅格、边界往复、连续坐标动态障碍物、连续轨迹安全评估、连续碰撞诊断和最小安全间距评估。
标准检查命令是 `moon check` 与 `moon test`。

## 可视化说明

`src/visualize/svg_exporter.mbt` 会导出网格、起点、终点、障碍物和最终路径的 SVG
字符串，也能通过 `grid_region_to_svg()` 叠加区域搜索候选格和障碍物边界角。调用方可将
字符串写入展示层或示例文件，仓库不提交大量生成图片。

## 开发路线

- 第一阶段：基础工程、地图模型和五类搜索算法。
- 第二阶段：JSON、CLI、SVG 和 benchmark 完善。
- 第三阶段：基于论文资料推进区域搜索、RS-APSO 和动态避障。
- 第四阶段：LPA*、D* Lite、RRT、RRT-Connect 与 RRT*。
- 第五阶段：mooncakes.io 发布与 MoonBit 生态适配。

详细设计、迁移说明、RS-APSO 开发准备与路线图见 `docs/`。

## License

This project is released under the MIT License. See `LICENSE`.
