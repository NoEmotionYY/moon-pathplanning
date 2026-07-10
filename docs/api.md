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

Planner 当前支持 `Bfs`、`Dfs`、`Dijkstra`、`AStar`、`BidirectionalAStar`、`LpaStar`、`DStarLite`、`Pso`、
`RsApso`、`Rrt`、`RrtConnect` 和 `RrtStar`。`LpaStar` 与 `DStarLite` 是当前阶段版增量规划入口，Planner 会返回统一 `PathResult`；它们用于验证调度、状态结构和变化单元记录，尚不是复用上一轮 open list 的完整增量规划实现。如果需要观察 `g/rhs/key` 状态或变化单元记录，应直接调用 `@algorithms.lpa_star_plan()`、`@algorithms.lpa_star_replan()`、`@algorithms.d_star_lite_plan()` 或 `@algorithms.d_star_lite_replan()`。`Pso` 与 `RsApso` 会在内部构建默认区域搜索候选集并返回统一 `PathResult`；
如果需要迭代次数、候选数量和适应度等附加信息，应直接调用 `@swarm.pso_plan()` 或
`@swarm.rs_apso_plan()`；如果需要 RRT/RRT-Connect/RRT* 迭代次数和采样树节点数，应直接调用
`@continuous.rrt_plan()`、`@continuous.rrt_connect_plan()` 或 `@continuous.rrt_star_plan()`。

## 算法调用示例

调用方也可以直接使用算法包：

```moonbit
let result = @algorithms.bfs(map, @grid.FourWay)
```

直接调用适合算法教学；业务入口推荐使用 Planner，以便保持返回字段一致。

## 增量规划阶段 API

LPA* 与 D* Lite 当前先提供 MoonBit 原生阶段入口，用于统一调度、测试增量变化场景并保留 `g/rhs/key` 状态结构。阶段版会在地图变化后重新生成一致的搜索状态，不复用上一轮 open list 或优先队列，因此不能等同于完整 LPA*/D* Lite 增量规划器。后续可以继续演进为复用上一轮 open list 的完整增量实现：

```moonbit
let initial = @algorithms.lpa_star_plan(
  map, @grid.FourWay, @heuristics.Manhattan,
)
let changed = @core.point(2, 1)
let updated = map.with_obstacle(changed)
let replanned = @algorithms.lpa_star_replan(
  updated, @grid.FourWay, @heuristics.Manhattan, [changed],
)
let dstar = @algorithms.d_star_lite_plan(
  updated, @grid.FourWay, @heuristics.Manhattan,
)
```

`IncrementalPlanResult` 包含统一 `PathResult`、路径节点对应的 `IncrementalNode` 数组和 `changed_cells`。`IncrementalNode` 记录 `point`、`g`、`rhs`、`key1` 和 `key2`，便于后续实现真正的优先队列增量更新时保持 API 兼容。

## 网格安全 API

障碍物膨胀用于在栅格地图上预留机器人安全边距：

```moonbit
let safe_map = map.inflate_obstacles(1)
let result = @planner.plan(safe_map, @planner.RsApso, @planner.default_options())
```

`inflate_obstacles(radius)` 会把每个障碍物周围 Chebyshev 半径内的合法栅格也标为障碍物。
如果膨胀后覆盖起点或终点，现有 `validate()` 会返回端点被阻塞的非法输入结果。

## 区域搜索 API

区域搜索模块用于 RS-APSO 前置预处理，也可以独立观察障碍物边界角和候选搜索区域：

```moonbit
let options = @region.default_options()
let corners = @region.detect_boundary_corners(map)
let region = @region.build_search_region(map, options)
```

`detect_boundary_corners()` 按论文中的 `(count, count1, count2)` 条件识别障碍物边界角。
`build_search_region()` 从边界角沿四方向探索自由栅格；当地图没有可用边界角时，默认回退
到所有可行走栅格，便于后续 PSO 仍有候选区域。

## RS-APSO 预留 API

根据论文资料，swarm 包已提供适应度、固定 seed 随机源、PSO 参数结构、自适应参数和
基础离散 RS-APSO 主循环。Planner 已接入 `Pso` 与 `RsApso`，直接调用 swarm 可获得附加指标：

```moonbit
let swarm_options = @swarm.default_options()
let result = @swarm.rs_apso_plan(map, region, swarm_options)
```

当前可用的基础能力包括 `path_length()`、`path_smoothness()`、`path_fitness()`、
`default_fitness_weights()`、`random_state(seed)`、`default_options()`、`candidate_path()`
、`adaptive_parameters()`、`pso_plan()` 和 `rs_apso_plan()`。当前 `rs_apso_plan()` 将粒子
表示为区域候选中间路点，并用自适应参数影响个体学习、群体学习和逃逸选择；当粒子达到
`stagnation_limit` 后，会按逃逸因子从全局最优和多次随机候选中选择适应度较低的逃逸点，
在保持固定 seed 可复现的同时减少单次随机逃逸的不稳定性。正式 API 需要
在 MoonBit 工具链可用后结合实现细节收敛。

## 连续几何 API

连续几何模块提供静态路径后处理和后续采样规划可复用的线段可见性基础：

```moonbit
let visible = @continuous.segment_is_walkable(
  map, @core.point(0, 0), @core.point(4, 4),
)
let shortened = @continuous.shortcut_path(map, result.path)
let rrt = @continuous.rrt_plan(map, @continuous.default_rrt_options())
let connected = @continuous.rrt_connect_plan(
  map, @continuous.default_rrt_options(),
)
let optimized = @continuous.rrt_star_plan(
  map, @continuous.default_rrt_star_options(),
)
```

`rasterized_segment_cells(start, goal)` 会用整数栅格中心线段生成经过的栅格序列，并保留起终点。
`segment_is_walkable(map, start, goal)` 会检查该序列中的每个栅格是否可行走；若线段穿过障碍物或地图外区域则返回 `false`。
`shortcut_path(map, path)` 会在静态可见性允许时跳过中间路点，保留首尾点。
基础采样规划入口由 `RrtOptions`、`default_rrt_options()`、`rrt_options(max_iterations, seed, goal_sample_rate)`、
`RrtStarOptions`、`default_rrt_star_options()`、`rrt_star_options(max_iterations, seed, goal_sample_rate, rewire_radius)`、
`rrt_plan(map, options)`、`rrt_connect_plan(map, options)` 和 `rrt_star_plan(map, options)` 组成；`rrt_plan()` 会在可行走栅格中心采样，选择最近树节点，
用 `segment_is_walkable()` 判断能否直连，并在找到终点后对树路径做快捷平滑。返回的
`RrtPathResult` 保留统一 `PathResult`，并附加实际迭代次数和采样树节点数。Planner 的
`rrt_connect_plan()` 会分别从起点和终点维护两棵采样树，轮流扩展并尝试让另一棵树连接到同一个采样点；
成功后把两棵树路径拼接并做快捷平滑。`rrt_star_plan()` 使用邻域半径选择更低代价父节点，
并在可见时重连邻域节点，基础测试会比较其路径代价不高于同 seed 的基础 RRT。Planner 的
`Rrt`、`RrtConnect` 与 `RrtStar` 算法类型使用默认参数；后续更丰富路径平滑后处理可继续复用
同一线段可见性入口。

## 动态避障 API

动态避障模块提供静态路径之后的局部修正能力：

```moonbit
let obstacle = @dynamic.moving_obstacle_with_velocity(@core.point(3, 2), 1.2, 1, 0)
let options = @dynamic.default_collision_options()
let adjusted = @dynamic.jump_avoidance_over_time(map, result.path, [obstacle], options)
```

`collision_radius()` 使用论文中的危险系数与安全系数公式；`would_collide()` 判断机器人点位
是否进入移动障碍物碰撞区域；`moving_obstacle_with_velocity()` 与 `MovingObstacle::at_step()`
用于按路径步数预测左右、上下或组合方向移动；`jump_avoidance_over_time()` 在下一路径点
发生碰撞风险时，沿靠近终点方向的同行或同列候选点进行跳跃修正。

边界往复障碍物可用反射步进 API 表达：

```moonbit
let bounced = obstacle.at_reflected_step(3, 0, 10, 0, 0)
let adjusted = @dynamic.jump_avoidance_over_reflected_time(
  map, result.path, [obstacle], options, 0, 10, 0, 0,
)
```

`reflected_coordinate()` 与 `MovingObstacle::at_reflected_step()` 会让坐标在 `[min, max]`
边界内往复反弹；当某一轴的 `min >= max` 时，该轴固定在 `min`，适合水平或垂直单轴往复。

连续坐标动态障碍物可用 Double 坐标和时间步预测：

```moonbit
let moving = @dynamic.continuous_moving_obstacle(0.0, 0.0, 1.0, 0.5, 0.0)
let projected = moving.at_time(2.0)
let adjusted = @dynamic.jump_avoidance_over_continuous_time(
  map, result.path, [moving], options, 0.5,
)
let safer = @dynamic.jump_avoidance_over_continuous_clearance(
  map, result.path, [moving], options, 0.5, 4,
)
let waited = @dynamic.jump_avoidance_over_continuous_wait(
  map, result.path, [moving], options, 0.5, 4, 2,
)
```

`ContinuousMovingObstacle` 保留小数坐标、速度大小和 x/y 方向速度；`would_collide_continuous()`
会直接用栅格点中心到连续障碍物坐标的距离判断碰撞半径；`jump_avoidance_over_continuous_time()`
按 `path` 索引乘以 `step_time` 预测障碍物位置后进行局部跳跃修正。`jump_avoidance_over_continuous_clearance()`
会把当前点到候选跳点的线段放入同一时间窗口采样，并按最小安全间距选择候选；当地图有横向空间时，
它可以选择更保守的横向跳点，为后续连续空间规划器提供更安全的局部修正入口。
`jump_avoidance_over_continuous_wait()` 会在候选移动线段仍不安全时插入原地等待点，并用调整后
路径长度推进后续时间线，适合没有横向绕行空间的狭窄通道。

连续轨迹安全评估可把离散路径转换成带时间的连续线段，并用采样判断是否进入连续动态障碍物
碰撞半径：

```moonbit
let segments = @dynamic.continuous_segments_from_grid_path(result.path, 1.0)
let safe = @dynamic.continuous_path_is_safe(segments, [moving], options, 4)
let collision = @dynamic.continuous_path_first_collision(
  segments, [moving], options, 4,
)
let clearance = @dynamic.continuous_path_min_clearance(
  segments, [moving], options, 4,
)
```

`ContinuousPoint` / `ContinuousSegment` 用 Double 坐标表示轨迹；`ContinuousSegment::point_at_time()`
按线段起止时间插值，`continuous_segment_collides()` 会在同一时间采样机器人位置和动态障碍物
预测位置。`ContinuousCollision` 会记录首个碰撞的 `segment_index`、`sample_index`、
`obstacle_index`、`time`、机器人连续坐标和障碍物连续坐标；`continuous_segment_first_collision()`
用于诊断单条线段，`continuous_path_first_collision()` 会按路径线段顺序返回首个碰撞报告。
`ContinuousClearance` 会记录最接近采样点的 `distance`、碰撞 `radius` 和 `clearance`
净安全间距，`continuous_segment_min_clearance()` 与 `continuous_path_min_clearance()` 可用于
比较不同候选轨迹的安全裕量。该能力用于后续更完整的连续空间规划模型，也可先作为路径
安全验收器和失败诊断入口。

## 可视化 API

基础 SVG 导出用于展示地图和最终路径；区域搜索 SVG 导出用于调试 RS-APSO 预处理；多路径 SVG 导出可用于对比不同算法结果：

```moonbit
let svg = @svg.grid_region_to_svg(map, region, result.path, 20)
let layered = @svg.grid_paths_to_svg(
  map,
  [
    @svg.path_layer("A*", astar.path, "#e6584d"),
    @svg.path_layer("RRT*", rrt_star.result.path, "#2a9d5b"),
  ],
  20,
)
let rrt_svg = @svg.rrt_comparison_to_svg(
  map,
  @continuous.rrt_options(600, 42, 0.2),
  @continuous.rrt_star_options(600, 42, 0.2, 3),
  20,
)
let html = @svg.grid_to_html("A* path", map, astar.path, 20)
```

`grid_region_to_svg()` 会叠加候选搜索区域、障碍物边界角、障碍物、路径、起点和终点。
`SvgPathLayer` 与 `path_layer(name, path, color)` 用于描述一条命名路径；`grid_paths_to_svg()`
会在同一地图上按颜色叠加多条路径，并在底部追加图例。`rrt_comparison_to_svg()`
会运行 RRT、RRT-Connect 与 RRT* 并复用多路径 SVG 导出；`default_rrt_comparison_to_svg()`
使用连续规划默认参数，适合快速观察基础采样规划差异。`grid_to_html()`、`grid_region_to_html()`、
`grid_paths_to_html()`、`rrt_comparison_to_html()` 和 `default_rrt_comparison_to_html()` 会把对应 SVG
包装为带基础样式的自包含 HTML 文档，适合由 CLI 或示例程序写入 `.html` 文件查看。

## Benchmark Runner

`bench` main 包固定复用两个 20x20 RS-APSO benchmark 场景，并附带动态避障对比场景，
可直接运行：

```bash
moon run ./bench
moon run ./bench -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run ./bench -- --example rs_apso_20x20_simple
moon run ./bench --target native -- examples/simple_grid.json
moon run ./bench --target native -- --map examples/weighted_grid.json
```

输出为 CSV，当前包含 `scenario`、`algorithm`、`status`、`path_nodes`、`total_cost`、
`path_length`、`smoothness`、`visited_nodes`、`expanded_nodes`、`iterations`、
`candidates`、`best_fitness`、`seed`、`population_size`、`max_iterations`、`repeats`、
`elapsed_us_total`、`elapsed_us_avg`、`safety_evaluated`、`continuous_safe` 和
`min_clearance`。
经典算法的 swarm 参数字段为 `0`；PSO 与 RS-APSO 会额外记录区域候选数量、实际迭代次数、
最终适应度和固定 seed 配置。静态 20x20 和 JSON 输入场景除默认 `rs_apso` 外，还会输出
`rs_apso_p30_i60_s2` 和 `rs_apso_p80_i80_s4` 两组参数对比行；算法名中的 `p`、`i`、`s`
分别表示种群规模、最大迭代次数和停滞阈值，CSV 字段会显式记录 seed、population 和 max_iterations。
静态场景也会输出 `rrt`、`rrt_connect`
和 `rrt_star` 行；这些行的 `candidates` 表示采样树节点数，`best_fitness` 与
`population_size` 为 `0`，benchmark 固定使用 seed 42，并将 RRT/RRT-Connect 最大采样次数
设为 600、目标采样率设为 0.2，RRT* 最大采样次数设为 600、重连半径设为 3。当前默认重复次数为 5，耗时使用 `moonbitlang/core/bench`
提供的 monotonic clock 记录。
动态场景使用 `dynamic_5x1`、`dynamic_10x10_crossing` 和 `dynamic_12x12_mixed`，算法列分别输出
`astar_static`、`dynamic_time`、`dynamic_reflected`、`dynamic_continuous` 和
`dynamic_continuous_wait`，用于比较静态路径、整数速度动态障碍物、边界往复预测、
连续安全感知修正和连续等待修正后的路径结果。其中连续动态行会把修正路径转换为连续线段，
并记录连续采样是否安全和最小安全间距；
普通静态或离散动态行的 `safety_evaluated` 为 `0`。
native 后端传入 JSON v1 地图文件时，runner 会只输出这些文件场景的 A 星、Dijkstra、
PSO、RS-APSO、RS-APSO 参数变体、RRT、RRT-Connect 和 RRT* 指标；无参数时仍输出内置 20x20 与动态避障场景。
使用 `--json/-j` 传入 JSON v1 字符串时也会只输出这些 inline 场景，并且不依赖文件系统。
使用 `--example/-e` 传入嵌入式示例名时也会输出同格式指标；该入口复用包内示例地图字符串，
可在没有文件系统读取能力的目标后端运行固定示例。

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

MoonBit 模块提供 schema 对应序列化和字符串解析入口：

```moonbit
let text = @json_map.grid_to_json(map, @grid.FourWay)
let parsed = @json_map.grid_from_json(text)
let embedded = @json_map.example_json("weighted_grid")
```

`grid_from_json(text)` 使用 `moonbitlang/core/json` 解析字符串，成功时返回
`GridJsonData?` 中的 `map` 与 `movement`，遇到不支持的 `format`、字段缺失或类型错误时
返回 `None`。`example_names()` 会列出包内嵌入的稳定示例名，`example_json(name)` 和
`example_grid_data(name)` 可按示例名返回 JSON 字符串或解析后的地图数据。CLI 和 benchmark
runner 都可用 `--json/-j` 直接接收 JSON 字符串，也可用 `--example/-e` 复用嵌入式示例；文件读取不放
在库入口内，当前由 native 后端边界负责：

```bash
moon run cli -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run cli -- --example weighted_grid
moon run cli --target native -- examples/simple_grid.json
moon run cli --target native -- --map examples/weighted_grid.json
```
