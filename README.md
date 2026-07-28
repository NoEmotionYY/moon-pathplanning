# Moon PathPlanning

Moon PathPlanning 是一个以 MoonBit 为核心的路径规划工程项目，提供网格搜索、采样
规划、动态避障基础能力、CLI、benchmark、SVG/HTML 输出和 Vue 3 可视化前端。

Web 前端通过 Web Worker 调用 MoonBit JavaScript Bridge，不使用 TypeScript 重写规划
算法；它还可以把 PNG、JPEG、WebP 正交迷宫图片识别为可预览、可确认导入的
`GridMapDocument`。

## 项目简介

项目面向机器人路径规划、游戏地图寻路、网格导航、算法教学和确定性仿真。仓库同时
包含可复用的 MoonBit 路径规划库、CLI 与 benchmark 工具、SVG/HTML 输出，以及用于
编辑地图、观察搜索过程和导入图片迷宫的浏览器应用。

## 在线演示

[https://noemotionyy.github.io/moon-pathplanning/](https://noemotionyy.github.io/moon-pathplanning/)

演示站点由 GitHub Pages 部署。浏览器首次加载时需要获取构建后的 Planner Worker、
Maze Import Worker 和 MoonBit Bridge 资源；推荐使用现代 Chromium、Firefox 或
Safari。

## 项目背景与引用

本项目参考 `zhm-real/PathPlanning` 的路径规划主题、算法思想和案例方向。参考项目
采用 MIT License；本仓库同样使用 MIT License，并在 MoonBit 原生包结构中重新组织
数据模型、测试、Planner 和可视化能力，不直接照搬 Python 脚本式实现。
完整上游来源、许可证和参考范围说明见
[docs/upstream.md](docs/upstream.md)。

## 核心能力

### MoonBit 核心

- `Point` / `Coord`、搜索状态、搜索错误和统一 `PathResult`。
- `GridMap`、四方向和八方向移动、障碍物、障碍物膨胀、terrain cost 与合法性检查。
- `WeightedGraph` 加权节点和边接口。
- Manhattan、Euclidean、Chebyshev 与 Octile 启发函数。
- BFS、DFS、Dijkstra、A 星和双向 A 星搜索。
- 区域搜索预处理：障碍物边界角识别、候选搜索区域生成和空地图自由区域回退。
- RS-APSO 基础组件：路径长度/平滑度适应度、固定 seed 随机源、自适应参数、停滞后多候选逃逸重采样、PSO/RS-APSO 主循环。
- 连续几何与采样规划基础组件：栅格中心线段栅格化、静态线段可见性检查、路径快捷平滑、基础 RRT、RRT-Connect 和 RRT* 采样规划。
- 动态避障基础组件：碰撞半径、移动障碍物碰撞检测、速度方向预测、边界往复预测、连续坐标时间预测、连续轨迹安全评估、连续碰撞诊断报告、连续轨迹最小安全间距评估、连续安全感知动态避障、连续等待避障和跳跃避障路径修正。
- Planner 算法调度，包含经典搜索、LPA*/D* Lite 阶段入口、基础 PSO、RS-APSO、RRT、RRT-Connect 和 RRT*；JSON v1 示例、序列化、字符串解析、嵌入式示例地图、SVG/HTML 导出、RRT 系列路径对比 SVG/HTML、CLI demo，以及支持 JSON 文件、JSON 字符串和示例名输入的 benchmark runner。
- LPA*/D* Lite 当前明确属于阶段入口：用于统一调度、状态结构和变化单元记录验证，尚不具备复用上一轮 open list 的增量状态能力。

### Web 前端

- 编辑 5×5～60×60 网格，设置起点、终点、障碍物和 terrain cost。
- 切换四方向或八方向移动；八方向规划遵循 MoonBit 核心的禁止穿墙角规则。
- 在独立 Planner Worker 中运行 12 种 MoonBit Planner 算法。
- 回放 BFS、DFS、Dijkstra、A* 的真实 discovered/expanded Trace；其他算法只显示最终路径。
- 导入、导出 `moon-pathplanning.grid.v1` JSON，并通过同一原子事务加载内置示例。
- 导入 PNG、JPEG、WebP 正交矩形迷宫，支持旋转、翻转、反色、入口候选、手动入口 Pair 和起终点交换。
- 提供深浅主题、响应式布局、结构化错误和事务状态反馈。

## 图片迷宫导入

```text
选择 PNG / JPEG / WebP
  → 旋转、翻转或反色
  → Maze Import Worker 分析
  → 正交结构检测
  → 墙体、通道和拓扑分析
  → 入口候选或手动入口 Pair
  → 2n+1 GridMapDocument
  → Canvas 预览
  → 用户确认
  → 原子地图导入事务
```

当前适合横纵墙体构成的正交矩形迷宫，包括深墙浅底、浅墙深底、透明背景、1～数
像素墙宽，以及单入口、双入口或多入口候选图片。当前不支持蜂窝/六边形迷宫、主要
由斜线构成的迷宫、SVG/PDF 图片导入、彩色答案路线自动剥离或任意自由形状墙体。

尺寸边界：

| 阶段 | 边界 |
|---|---|
| 文件与图片验证 | 图片文件最大 10 MiB；宽、高分别不超过 8192；总像素不超过 3200 万 |
| 识别与 Canvas 预览 | 转换结果硬上限 151×151，约对应最大 75×75 逻辑迷宫；76×76 会转换为 153×153 并被拒绝 |
| 正式导入主地图 | 当前上限 60×60；29×29 逻辑迷宫转换为 59×59，可以导入；30×30 转换为 61×61，只能预览 |

151×151 是识别和 Canvas 预览上限，不代表主地图可以正式编辑该尺寸。主地图仍采用
逐格 DOM 渲染，因此正式导入保持 60×60 上限。详细设计见
[图片迷宫导入设计](docs/maze-image-import.md)。

## 技术架构

图片导入路径：

```text
图片文件
   ↓ 浏览器安全解码
ImageMatrix
   ↓ transform snapshot
Maze Import Worker
   ↓
预处理 → 正交结构检测 → 拓扑和入口分析
   ↓
2n+1 GridMapDocument
   ↓
Canvas 预览
   ↓ 用户确认
原子地图导入事务
   ↓
Grid Store + Planner Store
   ↓
MoonBit Planner Worker
```

路径规划路径：

```text
Grid Store
  → usePlanner
  → plannerWorkerClient
  → planner.worker.ts
  → MoonBit plan_json
  → structured result / trace-batch
```

## 实现边界

- 完整可用能力：二维 `GridMap`、四/八方向移动、禁止八方向穿墙角、terrain cost、图结构、启发函数、BFS、DFS、Dijkstra、A 星、双向 A 星、统一 Planner、JSON v1、CLI、SVG/HTML 导出、benchmark runner 和核心测试。
- 基础实现能力：离散 PSO/RS-APSO 使用区域候选中间路点，并通过 A 星拼接 `start -> waypoint -> goal` 可行路径；基础栅格采样 RRT、RRT-Connect 和 RRT* 使用可行走栅格中心、固定 seed 和线段可见性。
- 阶段入口能力：LPA*/D* Lite 当前用于统一调度、`g/rhs/key` 状态结构和变化单元记录验证；地图变化后会重新生成一致搜索状态，不等同于复用上一轮 open list 或优先队列的增量状态规划器。
- 仍在路线图中：LPA*/D* Lite 增量状态复用、连续机器人运动学模型、RS-APSO 参数体系扩展和更丰富连续空间 RRT 系列案例。

## 当前完成情况

初步工程已包含源码、测试文件、示例地图、文档、CI 和 benchmark 说明，并已按论文方向
开始补充区域搜索、swarm 基础模块、连续几何与基础 RRT/RRT-Connect/RRT* 采样规划模块和动态避障模块，其中 PSO/RS-APSO 已能在区域候选点中
搜索中间路点并用 A 星拼接可行路径。JSON v1 当前提供 schema、示例地图、序列化和
字符串解析入口。CLI v1 支持内置 demo 地图、`--algorithm` 算法选择、`--json` 字符串输入、`--example` 跨后端示例名输入，也支持 native 后端读取 JSON 地图文件；
`bench` runner 已固定两个 20x20 RS-APSO 场景和三个动态避障场景，并以 5 次重复输出
经典搜索、LPA*/D* Lite 阶段入口、PSO/RS-APSO、RS-APSO 参数变体、RRT/RRT-Connect/RRT* 的 CSV 指标、耗时统计和连续动态行安全指标；runner 也支持 `--json` 字符串输入和 `--example` 示例名输入，native 后端还可读取 JSON v1 地图文件运行同格式 benchmark。
增量规划边界请按阶段能力理解：当前 LPA*/D* Lite 会在地图变化后重新生成一致的搜索状态，用于保留 API 和测试变化单元记录；增量状态复用仍在后续路线中。

## 快速开始

先安装 MoonBit 工具链，再在仓库根目录执行：

通用命令：

```bash
moon check
moon test
moon run cli
moon run cli -- --example weighted_grid
moon run cli --target native -- examples/simple_grid.json
moon run cli --target native -- --example weighted_grid --html weighted_grid.html
moon run cli --target native -- --algorithm dijkstra --example complex_maze --html dijkstra_complex_maze.html
moon run ./bench
moon run ./bench -- --example rs_apso_20x20_simple
moon run ./bench --target native -- examples/simple_grid.json
```

Linux/macOS bash 的 inline JSON 示例：

```bash
moon run cli -- --json '{"format":"moon-pathplanning.grid.v1","width":3,"height":3,"start":[0,0],"goal":[2,2],"movement":"four_way","obstacles":[],"terrain":[]}'
moon run ./bench -- --json '{"format":"moon-pathplanning.grid.v1","width":3,"height":3,"start":[0,0],"goal":[2,2],"movement":"four_way","obstacles":[],"terrain":[]}'
```

Windows PowerShell 推荐使用内置示例或 JSON 文件输入：

```powershell
# 使用内置示例
moon run cli -- --example weighted_grid
moon run cli -- --algorithm astar --example complex_maze
moon run ./bench -- --example rs_apso_20x20_simple

# 使用 JSON 文件，需要 native 后端
moon run cli --target native -- --map examples/weighted_grid.json
moon run ./bench --target native -- --map examples/weighted_grid.json
```

当前 CLI 默认运行 A 星；通过 `--algorithm/-a` 可选择 `bfs`、`dfs`、`dijkstra`、`astar`、`bidirectional_astar`、`lpa_star`、`d_star_lite`、`pso`、`rs_apso`、`rrt`、`rrt_connect` 或 `rrt_star`，并打印路径节点数、总代价、访问节点数和展开节点数。
Bash 中的字符串型 JSON 输入使用 `--json/-j`，不依赖文件读取。Windows PowerShell 下建议使用 `--example` 或 `--map` 输入；当前 MoonBit runner 在部分 Windows PowerShell 环境中传递 inline JSON 参数时可能处理其中的双引号，因此本项目不把 PowerShell inline JSON 作为已验证的推荐用法。
嵌入式示例地图使用 `--example/-e`，当前支持 `simple_grid`、`weighted_grid`、`rs_apso_20x20_simple`、`rs_apso_20x20_complex` 和 `complex_maze`，适合默认后端下复用示例内容。
文件型 JSON 输入需要 native 后端，命令形如
`moon run cli --target native -- --map examples/weighted_grid.json`。
HTML 可视化导出同样需要 native 后端，命令形如
`moon run cli --target native -- --algorithm astar --example complex_maze --html astar_complex_maze.html`，会在打印路径指标后生成包含算法名称、场景名称、网格、障碍物、起点、终点和最终路径的自包含 HTML 文件。
benchmark runner 会对 20x20 simple/complex 场景输出 A 星、Dijkstra、PSO、RS-APSO、RS-APSO 参数变体、RRT、RRT-Connect 和 RRT*
的路径长度、平滑度、访问/展开节点数、迭代次数、候选数量或采样树节点数、最终适应度、swarm 或采样参数、
重复次数和总/平均耗时；同时输出 `dynamic_5x1`、`dynamic_10x10_crossing` 和
`dynamic_12x12_mixed` 下静态 A 星基线、
整数速度动态修正、边界往复修正、连续安全感知修正和连续等待修正的同格式 CSV 行，并为连续动态行记录
`safety_evaluated`、`continuous_safe` 和 `min_clearance`。文件型 benchmark 输入需要 native
后端，命令形如 `moon run ./bench --target native -- --map examples/weighted_grid.json`。CI 中的 benchmark 步骤是功能 smoke test，不作为性能基准；当前 runner 尚未提供 `--repeats` 这类命令行轻量参数。

## 示例地图格式

`examples/simple_grid.json` 与 `examples/weighted_grid.json` 使用
`moon-pathplanning.grid.v1` schema；`examples/rs_apso_20x20_simple.json` 与
`examples/rs_apso_20x20_complex.json` 固定 20x20 RS-APSO benchmark 输入；`examples/complex_maze.json` 提供 25x25 四方向复杂迷宫，用于观察经典网格搜索在长通道和分支中的行为：

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
RS-APSO 基础能力、LPA*/D* Lite 阶段入口、连续几何、基础 RRT/RRT-Connect/RRT* 采样规划和动态避障，包含整数栅格、线段可见性、路径快捷平滑、单树/双树采样绕障、RRT* 邻域择优与重连、固定 seed 复现、RS-APSO 即时停滞逃逸复现、增量重规划变化单元记录、无路返回、边界往复、连续坐标动态障碍物、连续轨迹安全评估、连续碰撞诊断、最小安全间距评估、连续安全感知修正、连续等待修正和混合穿越障碍物场景。
标准检查命令是 `moon check` 与 `moon test`。CI 直接使用当前 MoonBit 工具链真实支持的命令：
`moon fmt --check`、`moon info`、`moon check --deny-warn` 和
`moon test --deny-warn`，并运行 CLI、示例、native JSON、HTML 导出和 benchmark smoke test。
当前 CI 通过官方安装脚本获取 MoonBit 稳定工具链；如官方脚本后续提供可靠版本固定参数，可再切换为固定版本。

## Web 可视化

`web/` 提供 Vue 3、TypeScript、Vite、Pinia 和原生 SVG 构建的交互式路径规划界面：

- 编辑 5×5 到 60×60 网格，设置障碍、起终点和 2/4/8 地形代价；
- 选择经典搜索、增量规划阶段入口、群智能与采样规划共 12 种算法；
- 在 Web Worker 中调用 MoonBit `plan_json`，显示连续 SVG 路径、结果指标与经典搜索回放；
- BFS、DFS、Dijkstra 和 A 星由 MoonBit 记录真实的 discovered/expanded 事件，前端支持暂停、单步、seek 和 0.5×～8× 回放；
- 导入/导出 `moon-pathplanning.grid.v1`，加载仓库 5 个原始示例；
- 支持深浅主题、桌面/移动响应式布局、键盘焦点和减少动画。

本地启动与验证：

```bash
cd web
npm ci
npm run dev
npm run type-check
npm test
npm run build
```

`npm run dev`、`type-check` 和 `build` 会先执行 `web/scripts/build-bridge.mjs`：

```text
Vue → plannerWorkerClient → planner.worker.ts
    → MoonBit plan_json → grid_from_json → planner.plan_with_trace
    → TracedPathResult JSON → trace-batch → request/map/algorithm 校验 → RAF 回放
```

MoonBit Bridge 也可独立检查：

```bash
moon check web_bridge --target js
moon test web_bridge --target js
moon build web_bridge_js --target js --release
```

当前 `web_bridge` 是可独立测试的结构化接口包；`web_bridge_js` 使用仓库工具链兼容的
executable-style JS linker 与显式 `exports: ["plan_json"]` 生成 ESM，空 `main` 只满足
链接器要求。Bridge 的输入输出均为稳定 JSON 字符串。BFS、DFS、Dijkstra 与 A 星使用
各自的 `*_with_trace` 入口在 MoonBit 搜索循环内记录真实顺序；普通 Planner API 保持
不变且不承担 Trace 开销。Worker 当前把一次返回的记录按 100 个事件分批发给主线程，
协议已可兼容后续真正的增量 `trace-batch`，但当前不是边计算边推送。

LPA* 与 D* Lite 在 Web 中明确标注为“阶段版”。统一 `PathResult` 当前未暴露的迭代数和
采样树节点数显示为 `—`。详细前端架构、已知限制与命令见
[web/README.md](web/README.md)。

Vite 已将 `base` 配置为 `/moon-pathplanning/`，并使用 Hash Router 避免 Pages 刷新
回退问题。`.github/workflows/deploy-pages.yml` 会在 `main` 分支构建 MoonBit Bridge、
运行前端测试并部署：

```text
https://noemotionyy.github.io/moon-pathplanning/
```

## 可视化说明

`src/visualize/svg_exporter.mbt` 会导出网格、起点、终点、障碍物和最终路径的 SVG
字符串，也能通过 `grid_region_to_svg()` 叠加区域搜索候选格和障碍物边界角。调用方可将
字符串写入展示层或示例文件；`grid_paths_to_svg()` 可叠加多条命名路径，`rrt_comparison_to_svg()` 可用固定采样参数把 RRT、RRT-Connect 和 RRT* 三条路径绘制到同一张 SVG 中。`grid_to_html()`、`grid_region_to_html()`、`grid_paths_to_html()` 和 `rrt_comparison_to_html()` 会把对应 SVG 包装为自包含 HTML 文档，便于直接落地成 `.html` 查看。仓库不提交大量生成图片。
CLI 已支持在 native 后端用 `--html/-o <output.html>` 直接导出基础路径 HTML。

## 开发路线

- 第一阶段：基础工程、地图模型和五类搜索算法。
- 第二阶段：JSON、CLI、SVG/HTML 和 benchmark 完善。
- 第三阶段：基于论文资料推进区域搜索、RS-APSO 和动态避障。
- 第四阶段：LPA*/D* Lite 增量状态复用，并继续扩展基础 RRT/RRT-Connect/RRT* 的连续空间案例。
- 第五阶段：mooncakes.io 发布与 MoonBit 生态适配。

详细设计、迁移说明、RS-APSO 开发准备与路线图见 `docs/`。

## License

This project is released under the MIT License. See `LICENSE`.
