# RS-APSO 开发准备

## 来源和目标

本文档根据论文《基于区域搜索粒子群算法的机器人路径规划》整理后续开发准备。目标是
把论文中的区域搜索、自适应粒子群、动态避障和仿真评估拆成 MoonBit 项目内可逐步实现、
可测试、可复用的模块边界。

当前仓库已经具备二维 `GridMap`、四方向和八方向移动、经典搜索算法、统一 `PathResult`、
SVG 导出和基础 benchmark 说明。RS-APSO 后续开发应复用这些基础能力，不重复实现已有
网格、坐标、障碍物和结果结构。

## 论文需求抽象

### 环境建模

- 使用二维栅格地图表达工作空间，障碍物栅格不可通行，自由栅格可探索。
- 栅格编号与坐标之间需要稳定转换，当前 `Point::key(width)` 与 `point_from_key()` 已覆盖
  这一边界。
- 为保证移动机器人安全，已提供 `GridMap::inflate_obstacles(radius)` 进行障碍物膨胀和安全边距处理。
- 若障碍物只部分占据某个栅格，建模时应将该栅格视为障碍物。

### 区域搜索预处理

- 先遍历障碍物栅格，统计周围 8 邻域自由栅格数量，以及水平、垂直方向自由栅格数量。
- 根据 `(count, count1, count2)` 条件筛选障碍物边界角。
- 从每个边界角出发，沿上、下、左、右四个方向探索，直到碰到边界或障碍物。
- 对探索得到的自由栅格去重，形成粒子群算法的候选搜索区域。
- 区域搜索的结果应能被 SVG 和 benchmark 复用，便于观察预处理是否减少无效搜索空间。

### RS-APSO 静态规划

- 粒子群算法在候选搜索区域中寻找路径控制点，最终生成从起点到终点的可行路径。
- 惯性权重、认知因子和社会因子需要随迭代阶段自适应变化，增强前期全局搜索和后期局部
  收敛能力。
- 适应度函数至少综合路径长度和平滑度。论文中路径长度权重高于平滑度，可作为默认值。
- 当粒子连续多次适应度变差时，应通过额外加速因子帮助粒子跳出较差区域。
- 随机过程需要提供可重复的 seed 或可注入随机源，保证测试和 benchmark 可复现。

### 动态避障

- 动态障碍物需要包含当前位置、速度方向和速度大小。
- 根据机器人速度、障碍物速度、单位栅格长度和比例系数计算碰撞检测半径。
- 当移动障碍物进入碰撞检测区域时，放弃原路径中的下一路径点，在靠近终点方向的候选点中
  重新选择跳跃避障点。
- 动态避障应作为静态路径之后的局部修正策略，不应破坏 `PathResult` 的统一返回模型。

## 建议模块边界

### 第一阶段：区域搜索

已开始新增 `src/region` 包：

- `BoundaryCorner`：记录边界角点和邻域统计信息。
- `SearchRegion`：记录候选自由栅格、边界角列表和 `contains(point)` 查询。
- `RegionSearchOptions`：记录无边界角时是否回退到全自由区域。
- `detect_boundary_corners(map)`：从 `GridMap` 中识别障碍物边界角。
- `build_search_region(map, options)`：生成候选搜索区域。
- `grid_region_to_svg(map, region, path, cell_size)`：叠加候选搜索区域和障碍物边界角，便于调试。

这一阶段不依赖随机数，也不改变 Planner，已添加区域搜索单元测试。障碍物膨胀和安全边距
由 `src/grid` 的 `inflate_obstacles(radius)` 提供。

### 第二阶段：RS-APSO 静态规划

已开始新增 `src/swarm` 包的基础层：

- `FitnessWeights`：路径长度和平滑度权重。
- `PsoOptions`：种群大小、最大迭代次数、seed、权重参数、停滞阈值。
- `RandomState`：固定 seed 的可复现随机源。
- `path_length()`、`path_smoothness()`、`path_fitness()`：路径长度、平滑度和综合适应度。
- `Particle`：候选中间路点、个体最优路点、最优适应度和停滞次数。
- `PsoPathResult`：保留 `PathResult`，并附加迭代次数、最终适应度和收敛状态。
- `candidate_path(map, waypoint, movement)`：用 A 星拼接 `start -> waypoint -> goal` 的可行路径。
- `pso_plan(map, region, options)`：在区域候选路点中运行基础离散 PSO。
- `adaptive_parameters(iteration, max_iterations)`：按论文公式生成惯性权重、认知因子、社会因子和逃逸加速因子。
- `rs_apso_plan(map, region, options)`：在基础离散 PSO 中引入自适应参数调度。

后续继续补充：

- 更贴近连续空间 PSO 的速度/位置模型。
- 更完整的较差区域逃逸策略和 benchmark 对比。

Planner 已新增 `Pso` 与 `RsApso` 算法类型，并在统一入口中返回 `PathResult`。`PsoPathResult`
附加的迭代次数、候选数量和最终适应度仍通过 `src/swarm` 直接调用获取。

### 第三阶段：动态避障

已开始新增 `src/dynamic` 包：

- `MovingObstacle`：动态障碍物状态。
- `ContinuousMovingObstacle`：连续坐标动态障碍物状态。
- `CollisionOptions`：机器人速度、单位栅格长度、比例系数和安全策略参数。
- `moving_obstacle_with_velocity(position, speed, velocity_x, velocity_y)`：记录移动方向。
- `continuous_moving_obstacle(x, y, speed, velocity_x, velocity_y)`：记录 Double 坐标和连续速度。
- `ContinuousPoint` / `ContinuousSegment`：连续轨迹点与带时间的连续线段。
- `ContinuousCollision`：记录首个连续碰撞的线段索引、采样索引、障碍物索引、碰撞时间和双方连续坐标。
- `ContinuousClearance`：记录连续轨迹最接近采样点的距离、碰撞半径和净安全间距。
- `continuous_segments_from_grid_path(path, step_time)`：把离散路径转换为连续时间线段。
- `MovingObstacle::at_step(step)`：按路径步数预测障碍物位置。
- `ContinuousMovingObstacle::at_time(time)` / `at_step_time(step, step_time)`：按连续时间预测障碍物位置。
- `reflected_coordinate(origin, velocity, step, min, max)`：计算边界往复反射坐标。
- `MovingObstacle::at_reflected_step(step, min_x, max_x, min_y, max_y)`：按路径步数预测边界往复障碍物位置。
- `collision_radius(options, obstacle)`：计算碰撞检测半径。
- `continuous_collision_radius(options, obstacle)`：计算连续障碍物碰撞检测半径。
- `would_collide(robot_point, obstacle, options)`：判断是否进入碰撞检测区域。
- `would_collide_continuous(robot_point, obstacle, options)`：按连续坐标判断是否进入碰撞检测区域。
- `continuous_segment_collides(segment, obstacles, options, samples)`：采样一段连续轨迹并检测同时间动态障碍物碰撞。
- `continuous_segment_first_collision(segment, obstacles, options, samples)`：返回单条连续线段上的首个碰撞报告。
- `continuous_segment_min_clearance(segment, obstacles, options, samples)`：返回单条连续线段上的最小安全间距报告。
- `continuous_path_is_safe(segments, obstacles, options, samples_per_segment)`：评估连续路径是否整体安全。
- `continuous_path_first_collision(segments, obstacles, options, samples_per_segment)`：按路径线段顺序返回首个连续碰撞报告。
- `continuous_path_min_clearance(segments, obstacles, options, samples_per_segment)`：返回整条连续路径上的最小安全间距报告。
- `jump_avoidance(map, path, obstacles, options)`：对静态路径进行局部修正。
- `jump_avoidance_over_time(map, path, obstacles, options)`：按路径步数预测移动障碍物后进行局部修正。
- `jump_avoidance_over_reflected_time(map, path, obstacles, options, min_x, max_x, min_y, max_y)`：按边界往复预测移动障碍物后进行局部修正。
- `jump_avoidance_over_continuous_time(map, path, obstacles, options, step_time)`：按连续时间步预测移动障碍物后进行局部修正。
- `jump_avoidance_over_continuous_clearance(map, path, obstacles, options, step_time, samples_per_segment)`：按连续线段最小安全间距选择候选跳点。
- `jump_avoidance_over_continuous_wait(map, path, obstacles, options, step_time, samples_per_segment, max_wait_steps)`：允许插入原地等待点，并按调整后路径长度推进后续时间线。

当前已覆盖碰撞半径、近距离碰撞判断、跳跃避障修正、安全路径不变、左右移动、上下移动和
双向移动障碍物，并新增水平/垂直边界往复、连续坐标投影、连续坐标碰撞、连续轨迹安全评估、连续碰撞诊断报告、连续轨迹最小安全间距评估、连续安全感知动态避障、连续等待动态避障、混合穿越障碍物
和进入碰撞半径后的跳跃修正测试。后续可继续补更完整的连续空间规划模型和 benchmark 对比。

## 测试清单

- 区域搜索能在无障碍地图中返回空边界角和可解释的搜索区域。
- 单个矩形障碍物能识别预期边界角，并沿四方向生成去重后的候选区域。
- 障碍物膨胀能按安全半径扩展障碍物，并在覆盖起终点时触发现有非法输入检查。
- 起点或终点被障碍物阻塞时，区域搜索和 RS-APSO 都返回非法输入。
- 基础 PSO 在固定 seed 下返回确定路径和确定适应度。
- RS-APSO 的候选搜索区域小于全图自由栅格数量，并能生成可行路径。
- 平滑度权重变化会影响折线拐角数量或角度惩罚。
- 连续三次适应度变差时触发较差区域逃逸逻辑。
- 动态障碍物未进入碰撞半径时路径不变，进入后产生有效跳跃点。
- 左右、上下和双向移动障碍物可按路径步数预测并触发跳跃修正。
- 边界往复移动障碍物可在水平/垂直边界内反弹，且进入碰撞半径后触发跳跃修正。
- 连续坐标动态障碍物可按时间步预测位置，且进入碰撞半径后触发跳跃修正。
- 连续路径线段可按时间采样，并能检出动态障碍物进入碰撞半径的风险。
- 连续路径首个碰撞报告能定位线段、采样点、障碍物索引、碰撞时间和双方连续坐标，安全路径返回 `None`。
- 连续路径最小安全间距报告能给出负安全间距的碰撞风险和正安全间距的安全裕量。
- 连续安全感知避障在候选跳点之间比较线段级安全裕量，并能在有空间时选择横向安全跳点。
- 连续等待避障能在狭窄通道中插入等待点，延后后续连续时间线并恢复正安全间距。
- 混合穿越障碍物场景能证明基础对角路径存在连续碰撞风险，等待修正后恢复整条连续路径安全。

## Benchmark 准备

推荐先固化以下基准场景：

- 20x20 简单静态栅格，起点 `(0, 0)`，终点 `(19, 19)`。
- 20x20 复杂静态栅格，保留更多障碍物和狭窄通道。
- RS-APSO、基础 PSO、区域搜索加基础 PSO、A 星和 Dijkstra 的路径长度、展开节点或迭代次数对比。
- 左右移动、上下移动、双向移动、边界往复和连续坐标时间步动态避障场景。

基准输出至少记录 MoonBit 版本、地图尺寸、seed、种群大小、最大迭代次数、最终路径长度、
最终适应度、实际迭代次数和运行时间。
当前已在 `examples/rs_apso_20x20_simple.json` 和 `examples/rs_apso_20x20_complex.json`
固化代表性 20x20 输入，并新增 `bench` main 包作为初始 runner。当前 runner 通过
`moon run ./bench` 输出 A 星、Dijkstra、PSO 和 RS-APSO 的 CSV 指标，并记录默认 5 次
重复运行、总耗时和平均耗时，并新增 `dynamic_5x1`、`dynamic_10x10_crossing` 与
`dynamic_12x12_mixed` 场景对比静态
A 星基线、整数速度动态修正、边界往复修正和连续坐标时间步修正。CLI 与 benchmark runner
已支持 `--json/-j` 字符串输入，native 后端也可读取 JSON v1 地图文件；动态连续行使用连续安全感知修正并输出
`safety_evaluated`、`continuous_safe` 和 `min_clearance`，用于暴露连续线段采样层面的剩余风险。
`dynamic_continuous_wait` 额外输出允许等待后的连续修正结果，便于比较空间绕行和时间等待两类策略。
`dynamic_12x12_mixed` 固定带静态障碍的 12x12 对角场景，用三条动态障碍物轨迹压测混合组合下的修正指标。
后续可继续补跨后端文件打包策略和更高级连续空间模型。

## 当前开放问题

- 已通过官方 MoonBit Windows x86_64 便携工具链完成 `moon check` 与 `moon test`；后续需要把工具链安装或临时 `MOON_HOME` 设置沉淀为稳定开发步骤。
- JSON v1 已具备字符串解析入口，20x20 论文基准地图目前已作为项目 benchmark 输入固化；CLI 与 benchmark runner 已能通过 `--json/-j` 接收 JSON 字符串，CLI 也能在 native 后端读取 JSON 文件并运行 A 星 demo。
- 障碍物膨胀半径需要结合机器人尺寸决定，库层提供参数，不内置具体机器人尺寸。
- 当前 PSO 随机源已采用固定 seed 的可复现实现；benchmark runner 已把 seed、种群大小、最大迭代次数、重复次数和耗时统计显式记录到输出。
- 论文仿真时间基于 MATLAB 环境，MoonBit benchmark 只能比较项目内相对性能，不直接声称复现论文耗时。
