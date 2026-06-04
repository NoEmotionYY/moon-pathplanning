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
- `CollisionOptions`：机器人速度、单位栅格长度、比例系数和安全策略参数。
- `moving_obstacle_with_velocity(position, speed, velocity_x, velocity_y)`：记录移动方向。
- `MovingObstacle::at_step(step)`：按路径步数预测障碍物位置。
- `collision_radius(options, obstacle)`：计算碰撞检测半径。
- `would_collide(robot_point, obstacle, options)`：判断是否进入碰撞检测区域。
- `jump_avoidance(map, path, obstacles, options)`：对静态路径进行局部修正。
- `jump_avoidance_over_time(map, path, obstacles, options)`：按路径步数预测移动障碍物后进行局部修正。

当前已覆盖碰撞半径、近距离碰撞判断、跳跃避障修正、安全路径不变、左右移动、上下移动和
双向移动障碍物。后续可继续补带边界往复运动的连续时间模拟。

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

## Benchmark 准备

推荐先固化以下基准场景：

- 20x20 简单静态栅格，起点 `(0, 0)`，终点 `(19, 19)`。
- 20x20 复杂静态栅格，保留更多障碍物和狭窄通道。
- RS-APSO、基础 PSO、区域搜索加基础 PSO、A 星和 Dijkstra 的路径长度、展开节点或迭代次数对比。
- 左右移动、上下移动和双向移动障碍物三类动态避障场景。

基准输出至少记录 MoonBit 版本、地图尺寸、seed、种群大小、最大迭代次数、最终路径长度、
最终适应度、实际迭代次数和运行时间。
当前已在 `examples/rs_apso_20x20_simple.json` 和 `examples/rs_apso_20x20_complex.json`
固化代表性 20x20 输入，并新增 `bench` main 包作为初始 runner。当前 runner 通过
`moon run ./bench` 输出 A 星、Dijkstra、PSO 和 RS-APSO 的 CSV 指标；后续可继续补
重复次数、运行时间统计和文件型 JSON 输入。

## 当前开放问题

- 已通过官方 MoonBit Windows x86_64 便携工具链完成 `moon check` 与 `moon test`；后续需要把工具链安装或临时 `MOON_HOME` 设置沉淀为稳定开发步骤。
- 完整 JSON 文件解析还未确定依赖边界，20x20 论文基准地图目前已作为项目 benchmark 输入固化。
- 障碍物膨胀半径需要结合机器人尺寸决定，库层提供参数，不内置具体机器人尺寸。
- 当前 PSO 随机源已采用固定 seed 的可复现实现；后续 benchmark runner 需要把 seed、种群大小和最大迭代次数显式记录到输出。
- 论文仿真时间基于 MATLAB 环境，MoonBit benchmark 只能比较项目内相对性能，不直接声称复现论文耗时。
