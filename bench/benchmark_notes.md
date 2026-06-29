# Benchmark 说明

初步工程先把行为测试跑稳，再建立性能基线。后续 benchmark 计划至少固定以下场景：

- 空网格中 BFS、Dijkstra 与 A 星的访问节点对比。
- 障碍密集网格中 A 星与双向 A 星的展开节点对比。
- terrain cost 明显不均匀时 Dijkstra 与 A 星的代价一致性。
- 四方向与八方向移动对 frontier 规模和路径长度的影响。
- `examples/rs_apso_20x20_simple.json` 与 `examples/rs_apso_20x20_complex.json` 下，A 星、Dijkstra、基础 PSO、区域搜索加 PSO、RS-APSO、RRT、RRT-Connect 与 RRT* 的路径长度和运行指标对比。
- 动态障碍物左右移动、上下移动、双向移动、边界往复移动和连续坐标时间步预测时，跳跃避障前后的路径有效性对比。

20x20 示例地图是项目内代表性 benchmark 输入，用于保持场景规模、障碍密度和通道复杂度
稳定；不直接声称复刻论文图中的精确障碍坐标。

基准输出应记录 MoonBit 版本、目标后端、地图尺寸、重复次数、总代价、访问节点数和
展开节点数。涉及 PSO 和 RS-APSO 时，还应记录 seed、种群大小、最大迭代次数、最终适应度
和实际迭代次数，避免只比较单次耗时。

当前本地验证基线：已用 MoonBit `0.1.20260529` 便携工具链执行 `moon check` 与 `moon test`，
75 项测试全部通过。后续 benchmark runner 应在输出中记录同类工具链版本和目标后端信息。
当前 runner 可通过 `moon run ./bench` 执行，输出 20x20 simple/complex 场景下 A 星、
Dijkstra、PSO、RS-APSO、RRT、RRT-Connect 和 RRT* 的 CSV 指标，并记录 seed、种群大小或采样参数、最大迭代次数、默认 5 次
重复运行次数、总耗时和平均耗时。runner 也输出 `dynamic_5x1`、`dynamic_10x10_crossing`
与 `dynamic_12x12_mixed`
动态避障场景，覆盖静态 A 星基线、整数速度动态修正、边界往复修正和连续坐标时间步修正。
CSV 现在额外包含 `safety_evaluated`、`continuous_safe` 和 `min_clearance`；普通静态或离散
动态行标记为未评估，连续动态行会用连续轨迹采样结果记录是否安全以及最小安全间距。
`dynamic_continuous` 当前使用连续安全感知修正，按候选线段最小安全间距选择可行跳点；
`dynamic_continuous_wait` 会在狭窄通道中插入等待点，并用同样的连续安全指标评估修正后路径。
`dynamic_12x12_mixed` 额外加入静态障碍和三条不同方向的动态障碍物轨迹，用于观察混合动态组合下的路径长度、平滑度和连续安全裕量。
benchmark runner 已能通过 `--json/-j` 读取 JSON v1 字符串，不依赖文件系统；也能通过
`--example/-e` 从包内嵌入式示例地图读取 `simple_grid`、`weighted_grid`、`rs_apso_20x20_simple`
和 `rs_apso_20x20_complex`。native 后端还支持位置参数或 `--map/-m` 读取 JSON v1 地图文件，
并按文件中的 movement 选择启发式、swarm movement 和静态采样规划输入；下一步应继续补更高级连续空间规划模型。
`src/continuous` 已提供静态线段可见性、路径快捷平滑、基础 RRT、RRT-Connect 和 RRT* 采样规划；benchmark
已为三类采样算法增加路径长度、平滑度、采样树节点数和耗时对比行。
