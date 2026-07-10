# OSC 2026 验收对照

| 功能 | 实现状态 | 主要实现文件 | 测试文件 | 运行方式 |
|---|---|---|---|---|
| GridMap | 已完成 | `src/grid/grid_map.mbt`, `src/grid/movement.mbt` | `test/grid_test.mbt` | `moon test` |
| BFS | 已完成 | `src/algorithms/bfs.mbt` | `test/bfs_test.mbt` | `moon test` |
| DFS | 已完成 | `src/algorithms/dfs.mbt` | `test/dfs_test.mbt` | `moon test` |
| Dijkstra | 已完成 | `src/algorithms/dijkstra.mbt` | `test/dijkstra_test.mbt` | `moon test` |
| A* | 已完成 | `src/algorithms/astar.mbt` | `test/astar_test.mbt` | `moon run cli` |
| 双向 A* | 已完成 | `src/algorithms/bidirectional_astar.mbt` | `test/astar_test.mbt` | `moon test` |
| PSO | 基础离散实现 | `src/swarm/pso.mbt` | `test/swarm_test.mbt` | `moon run ./bench -- --example rs_apso_20x20_simple` |
| RS-APSO | 基础离散实现 | `src/swarm/pso.mbt`, `src/swarm/options.mbt` | `test/swarm_test.mbt` | `moon run ./bench -- --example rs_apso_20x20_simple` |
| LPA* | 阶段入口 | `src/algorithms/incremental.mbt` | `test/incremental_test.mbt` | `moon test` |
| D* Lite | 阶段入口 | `src/algorithms/incremental.mbt` | `test/incremental_test.mbt` | `moon test` |
| RRT | 基础实现 | `src/continuous/rrt.mbt` | `test/continuous_test.mbt` | `moon run ./bench -- --example rs_apso_20x20_simple` |
| RRT-Connect | 基础实现 | `src/continuous/rrt_connect.mbt` | `test/continuous_test.mbt` | `moon test` |
| RRT* | 基础实现 | `src/continuous/rrt_star.mbt` | `test/continuous_test.mbt` | `moon test` |
| 动态避障 | 基础实现 | `src/dynamic/*.mbt` | `test/dynamic_test.mbt` | `moon run ./bench` |
| JSON | 已完成 | `src/io/json_map.mbt`, `src/io/example_maps.mbt` | `test/json_map_test.mbt` | `moon run cli --target native -- --map examples/weighted_grid.json` |
| CLI | 已完成 | `cli/main.mbt` | CI smoke test | `moon run cli` |
| SVG/HTML | 已完成 | `src/visualize/svg_exporter.mbt` | `test/visualize_test.mbt` | `moon run cli --target native -- --example weighted_grid --html weighted_grid.html` |
| Benchmark | 已完成 | `bench/rs_apso_bench.mbt` | CI smoke test | `moon run ./bench -- --example rs_apso_20x20_simple` |

## 标准检查命令

```bash
moon fmt --check
moon info
git diff --exit-code
moon check
moon test
moon check --deny-warn
moon test --deny-warn
```

## 示例运行命令

```bash
moon run cli
moon run cli -- --example weighted_grid
moon run cli --target native -- --map examples/weighted_grid.json
moon run cli --target native -- --example weighted_grid --html weighted_grid.html
moon run ./bench -- --example rs_apso_20x20_simple
```

## 已知限制

- LPA*/D* Lite 是阶段入口，用于统一调度、状态结构和变化单元记录验证；当前不复用上一轮 open list 或优先队列。
- PSO/RS-APSO 是区域候选路点上的离散基础实现，不声明覆盖论文中的全部连续空间粒子运动模型。
- RRT/RRT-Connect/RRT* 是基础栅格中心采样实现，不声明覆盖连续机器人运动学规划器的全部场景。
- 动态避障是基础局部修正和连续安全评估组件，不内置具体机器人尺寸或控制器模型。

## 发布与仓库状态

- mooncakes.io：模块名 `NoEmotionYY/moon-pathplanning`，当前仓库版本号 `0.1.0`。发布状态需在提交前通过 `moon add NoEmotionYY/moon-pathplanning` 或 mooncakes.io 页面人工确认。
- GitHub：`https://github.com/NoEmotionYY/moon-pathplanning`。默认分支和最新 CI 状态需在提交前人工确认。
- GitLink：`https://gitlink.org.cn/NoEmotionYY/moon-pathplanning`。同步状态需在提交前人工确认。
