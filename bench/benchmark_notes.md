# Benchmark 说明

初步工程先把行为测试跑稳，再建立性能基线。后续 benchmark 计划至少固定以下场景：

- 空网格中 BFS、Dijkstra 与 A 星的访问节点对比。
- 障碍密集网格中 A 星与双向 A 星的展开节点对比。
- terrain cost 明显不均匀时 Dijkstra 与 A 星的代价一致性。
- 四方向与八方向移动对 frontier 规模和路径长度的影响。
- `examples/rs_apso_20x20_simple.json` 与 `examples/rs_apso_20x20_complex.json` 下，A 星、Dijkstra、基础 PSO、区域搜索加 PSO 与 RS-APSO 的路径长度和运行指标对比。
- 动态障碍物左右移动、上下移动和双向移动时，跳跃避障前后的路径有效性对比。

20x20 示例地图是项目内代表性 benchmark 输入，用于保持场景规模、障碍密度和通道复杂度
稳定；不直接声称复刻论文图中的精确障碍坐标。

基准输出应记录 MoonBit 版本、目标后端、地图尺寸、重复次数、总代价、访问节点数和
展开节点数。涉及 PSO 和 RS-APSO 时，还应记录 seed、种群大小、最大迭代次数、最终适应度
和实际迭代次数，避免只比较单次耗时。

当前本地验证基线：已用 MoonBit `0.1.20260529` 便携工具链执行 `moon check` 与 `moon test`，
37 项测试全部通过。后续 benchmark runner 应在输出中记录同类工具链版本和目标后端信息。
当前 runner 可通过 `moon run ./bench` 执行，输出 20x20 simple/complex 场景下 A 星、
Dijkstra、PSO 和 RS-APSO 的 CSV 指标，并记录 seed、种群大小和最大迭代次数。下一步应补
重复运行次数、耗时统计和 JSON 文件输入。
