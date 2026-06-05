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

Planner 当前支持 `Bfs`、`Dfs`、`Dijkstra`、`AStar`、`BidirectionalAStar`、`Pso` 和
`RsApso`。`Pso` 与 `RsApso` 会在内部构建默认区域搜索候选集并返回统一 `PathResult`；
如果需要迭代次数、候选数量和适应度等附加信息，应直接调用 `@swarm.pso_plan()` 或
`@swarm.rs_apso_plan()`。

## 算法调用示例

调用方也可以直接使用算法包：

```moonbit
let result = @algorithms.bfs(map, @grid.FourWay)
```

直接调用适合算法教学；业务入口推荐使用 Planner，以便保持返回字段一致。

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
表示为区域候选中间路点，并用自适应参数影响个体学习、群体学习和逃逸选择。正式 API 需要
在 MoonBit 工具链可用后结合实现细节收敛。

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
```

`ContinuousMovingObstacle` 保留小数坐标、速度大小和 x/y 方向速度；`would_collide_continuous()`
会直接用栅格点中心到连续障碍物坐标的距离判断碰撞半径；`jump_avoidance_over_continuous_time()`
按 `path` 索引乘以 `step_time` 预测障碍物位置后进行局部跳跃修正。

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

基础 SVG 导出用于展示地图和最终路径；区域搜索 SVG 导出用于调试 RS-APSO 预处理：

```moonbit
let svg = @svg.grid_region_to_svg(map, region, result.path, 20)
```

`grid_region_to_svg()` 会叠加候选搜索区域、障碍物边界角、障碍物、路径、起点和终点。

## Benchmark Runner

`bench` main 包固定复用两个 20x20 RS-APSO benchmark 场景，并附带动态避障对比场景，
可直接运行：

```bash
moon run ./bench
moon run ./bench -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run ./bench --target native -- examples/simple_grid.json
moon run ./bench --target native -- --map examples/weighted_grid.json
```

输出为 CSV，当前包含 `scenario`、`algorithm`、`status`、`path_nodes`、`total_cost`、
`path_length`、`smoothness`、`visited_nodes`、`expanded_nodes`、`iterations`、
`candidates`、`best_fitness`、`seed`、`population_size`、`max_iterations`、`repeats`、
`elapsed_us_total`、`elapsed_us_avg`、`safety_evaluated`、`continuous_safe` 和
`min_clearance`。
经典算法的 swarm 参数字段为 `0`；PSO 与 RS-APSO 会额外记录区域候选数量、实际迭代次数、
最终适应度和固定 seed 配置。当前默认重复次数为 5，耗时使用 `moonbitlang/core/bench`
提供的 monotonic clock 记录。
动态场景使用 `dynamic_5x1` 和 `dynamic_10x10_crossing`，算法列分别输出
`astar_static`、`dynamic_time`、`dynamic_reflected` 和 `dynamic_continuous`，用于比较静态
路径、整数速度动态障碍物、边界往复预测和连续坐标时间步预测后的路径修正结果。
其中连续动态行会把修正路径转换为连续线段，并记录连续采样是否安全和最小安全间距；
普通静态或离散动态行的 `safety_evaluated` 为 `0`。
native 后端传入 JSON v1 地图文件时，runner 会只输出这些文件场景的 A 星、Dijkstra、
PSO 和 RS-APSO 指标；无参数时仍输出内置 20x20 与动态避障场景。
使用 `--json/-j` 传入 JSON v1 字符串时也会只输出这些 inline 场景，并且不依赖文件系统。

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
```

`grid_from_json(text)` 使用 `moonbitlang/core/json` 解析字符串，成功时返回
`GridJsonData?` 中的 `map` 与 `movement`，遇到不支持的 `format`、字段缺失或类型错误时
返回 `None`。CLI 和 benchmark runner 都可用 `--json/-j` 直接接收 JSON 字符串；文件读取不放
在库入口内，当前由 native 后端边界负责：

```bash
moon run cli -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run cli --target native -- examples/simple_grid.json
moon run cli --target native -- --map examples/weighted_grid.json
```
