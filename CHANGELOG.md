# Changelog

## Unreleased

- 根据《基于区域搜索粒子群算法的机器人路径规划》新增 RS-APSO 后续开发准备文档。
- 调整路线图，将区域搜索、RS-APSO 与动态避障列为下一阶段重点。
- 补充 RS-APSO 预留 API 和 benchmark 指标准备。
- 新增 `GridMap::inflate_obstacles(radius)` 与测试，支持障碍物膨胀安全边距建模。
- 新增 `src/region` 区域搜索模块与测试，支持障碍物边界角识别和候选搜索区域生成。
- 新增 `src/swarm` 基础模块与测试，支持路径适应度、固定 seed 随机源和 PSO 参数默认值。
- 新增基础离散 `pso_plan()`，支持从区域候选中间路点生成可行路径并保持固定 seed 可复现。
- 新增 `src/dynamic` 动态避障基础模块与测试，支持碰撞半径、碰撞判断、速度方向预测和跳跃避障路径修正。
- 新增 `adaptive_parameters()` 与基础离散 `rs_apso_plan()`，支持论文自适应参数调度和固定 seed 复现。
- Planner 新增 `Pso` 与 `RsApso` 算法类型，通过区域搜索候选集统一返回 `PathResult`。
- 新增 `grid_region_to_svg()` 与测试，支持候选搜索区域和障碍物边界角 SVG 叠加导出。
- 新增 `rs_apso_20x20_simple.json` 与 `rs_apso_20x20_complex.json`，固定 RS-APSO benchmark 代表性输入。
- 新增 `bench` main 包，可通过 `moon run ./bench` 输出 20x20 simple/complex 场景下 A 星、Dijkstra、PSO 和 RS-APSO 的 CSV 指标。
- benchmark runner 新增默认 5 次重复运行、总耗时和平均耗时字段。
- 新增 `grid_from_json(text)`，支持 JSON v1 地图字符串解析并返回地图和移动模式。
- 动态避障新增边界往复反射预测和对应跳跃避障场景测试。
- CLI 新增 native 后端 JSON 文件输入，支持 `moon run cli --target native -- <map.json>`。
- CLI 与 benchmark runner 新增 `--json/-j` JSON 字符串输入参数，复用 JSON v1 解析入口且不依赖文件系统。
- 动态避障新增连续坐标动态障碍物、按时间步预测、连续碰撞检测和跳跃避障测试。
- 动态避障新增连续轨迹安全评估，支持从离散路径生成带时间线段并采样检测连续动态障碍物碰撞风险。
- 动态避障新增连续碰撞诊断报告，支持返回首个碰撞线段、采样点、障碍物索引、碰撞时间和双方连续坐标。
- 动态避障新增连续轨迹最小安全间距评估，支持返回最接近采样点的距离、碰撞半径和净安全间距。
- 动态避障新增连续安全感知修正，按连续线段最小安全间距选择横向候选跳点。
- 动态避障新增连续等待修正，支持在狭窄通道中插入原地等待点并延后后续连续时间线。
- benchmark runner 新增 `dynamic_5x1` 场景，覆盖静态 A 星、整数速度、边界往复和连续坐标时间步动态避障修正。
- benchmark runner 新增 native 后端 JSON 文件输入参数，支持位置参数和 `--map/-m` 读取 JSON v1 地图并输出 CSV 指标。
- benchmark runner 新增 `dynamic_10x10_crossing` 场景，覆盖 10x10 多方向穿越动态障碍物下的路径修正指标。
- benchmark runner 新增连续动态安全指标列：`safety_evaluated`、`continuous_safe` 和 `min_clearance`。
- benchmark runner 新增 `dynamic_12x12_mixed` 场景，覆盖静态障碍、三类移动障碍物、边界往复、连续安全感知和连续等待修正的混合动态组合。
- 使用官方 MoonBit `0.1.20260529` 便携工具链完成 `moon check` 与 `moon test`，当前 58 项测试全部通过。
- 按当前 MoonBit 工具链迁移模块清单，从已弃用的 `moon.mod.json` 切换为 `moon.mod`。

## 0.1.0 - 2026-05-23

- 初始化 MoonBit 模块、MIT License、中文执行日志和工程文档。
- 实现网格地图、移动模式、terrain cost、加权图与启发函数。
- 实现 BFS、DFS、Dijkstra、A 星、双向 A 星和统一 Planner。
- 添加 MoonBit 测试、JSON 示例与序列化、SVG 导出、CLI demo 和 CI。
