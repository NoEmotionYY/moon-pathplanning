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
| CLI | 已完成 | `cli/main.mbt` | CI smoke test | `moon run cli -- --algorithm dijkstra --example complex_maze` |
| SVG/HTML | 已完成 | `src/visualize/svg_exporter.mbt` | `test/visualize_test.mbt` | `moon run cli --target native -- --algorithm astar --example complex_maze --html astar_complex_maze.html` |
| Benchmark | 已完成 | `bench/rs_apso_bench.mbt` | CI smoke test | `moon run ./bench -- --example rs_apso_20x20_simple` |

## Web 验收

### Web 基础

| 检查项 | 预期结果 | 验证方式 |
|---|---|---|
| TypeScript 严格检查 | `vue-tsc --noEmit` 无错误 | `cd web && npm run type-check` |
| Vitest | 全部测试通过 | `cd web && npm test` |
| Production build | Vite 构建成功 | `cd web && npm run build` |
| Worker chunk | Planner Worker 与 Maze Import Worker 均为独立 chunk | 检查 `web/dist/assets/` |
| Pages base | 构建资源使用 `/moon-pathplanning/` | 检查 `web/vite.config.ts` 和 `web/dist/index.html` |
| JSON 导入导出 | v1 文档可往返，导入通过原子事务 | `useMapImportExport` 测试和浏览器验收 |
| 示例地图 | 5 个示例可通过原子事务加载 | `loadExample` 测试和浏览器验收 |
| Planner Worker | 结构化 Bridge 结果可返回，旧请求可隔离 | `plannerWorkerClient`、Store 测试 |
| Trace 回放 | BFS/DFS/Dijkstra/A* 真实 Trace 可播放、暂停、单步和 seek | Vitest 与浏览器验收 |

### 图片迷宫

| 检查项 | 预期结果 | 主要验证 |
|---|---|---|
| 5×5 | 准确识别 5 行 × 5 列 | `analyzeRasterMaze.test.ts` |
| 8×10 | 准确识别 8 行 × 10 列 | `analyzeRasterMaze.test.ts` |
| 20×20 | 准确识别 20 行 × 20 列 | `analyzeRasterMaze.test.ts` |
| 旋转 90° | 变换后行列、预览和入口一致 | `imageTransform.test.ts`、管线测试 |
| 透明背景 | Alpha 合成后背景不被当作黑墙 | `imageAnalysis.test.ts`、管线测试 |
| 深浅背景 | 深墙浅底、浅墙深底均可识别 | `wallPolarity.test.ts`、管线测试 |
| 单入口 | 不伪造第二入口，进入人工处理或失败状态 | 入口选择测试 |
| 多入口 | 返回候选与 Pair，不擅自覆盖人工选择 | 入口选择测试 |
| 手动 Pair | 起点和终点候选重新生成有效文档 | 手动入口与 Wizard 测试 |
| 起终点交换 | 交换后重新转换，障碍和通道不变 | 手动入口与 Wizard 测试 |
| 59×59 | 29×29 逻辑迷宫可正式导入 | 转换、能力和事务测试 |
| 61×61 | 30×30 逻辑迷宫只能预览 | 能力和弹窗测试 |
| 151×151 | 75×75 逻辑迷宫只能预览 | 管线、转换和能力测试 |
| Unsupported topology | 蜂窝、六边形、斜线主体不生成伪地图 | 正交检测与完整管线测试 |
| Hard cancel | 同步分析通过 terminate Worker 取消 | Worker Client 测试 |
| Stale preview | mapVersion 变化后禁止确认旧预览 | Wizard 与事务测试 |
| Path/Trace 清理 | 正式导入后旧 Path、Trace、RAF 清空 | 真实 Pinia 事务测试 |
| Planner 迟到消息 | 旧 progress/trace/completed 无法污染新地图 | Planner stale 测试 |

### 原子地图事务

| 入口或语义 | 验收要求 |
|---|---|
| 图片导入 | 用户二次确认后调用 `applyMapDocumentTransaction` |
| JSON 导入 | 选择文件时记录 mapVersion，读取和校验完成后调用事务 |
| 示例加载 | fetch 前记录 mapVersion，成功解析后调用事务 |
| mapVersion | 成功替换只增加 1 |
| rollback | 后置失败恢复 Grid 和 Planner 快照 |
| busy | 同时只执行一个地图事务，结束后可重试 |
| stale | 读取或识别期间地图变化时拒绝覆盖 |
| Planner | 阻止新请求、硬取消旧请求并拒绝迟到消息 |
| 用户偏好 | 默认保留 selectedAlgorithm 和 playbackSpeed |

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

```bash
cd web
npm ci
npm run type-check
npm test
npm run build
```

## 示例运行命令

```bash
moon run cli
moon run cli -- --example weighted_grid
moon run cli --target native -- --map examples/weighted_grid.json
moon run cli --target native -- --example weighted_grid --html weighted_grid.html
moon run cli --target native -- --algorithm dijkstra --example complex_maze --html dijkstra_complex_maze.html
moon run ./bench -- --example rs_apso_20x20_simple
```

## 输入与提交状态

| 项目 | 状态 |
|---|---|
| PowerShell inline JSON | 不作为推荐用法 |
| PowerShell `--example` | 已支持 |
| CLI `--algorithm` | 已支持 |
| PowerShell native `--map` | 已支持 |
| GitHub Actions | 以远程实际状态为准，未查询时不标记完成 |
| GitLink 同步 | 待人工确认 |
| mooncakes.io 发布 | 待人工确认；未发布时标记未完成 |
| LPA*/D* Lite | 阶段入口 |
| PSO/RS-APSO | 离散基础实现 |
| RRT 系列 | 基础栅格采样实现 |

## 已知限制

- LPA*/D* Lite 是阶段入口，用于统一调度、状态结构和变化单元记录验证；当前不复用上一轮 open list 或优先队列。
- PSO/RS-APSO 是区域候选路点上的离散基础实现，不声明覆盖论文中的全部连续空间粒子运动模型。
- RRT/RRT-Connect/RRT* 是基础栅格中心采样实现，不声明覆盖连续机器人运动学规划器的全部场景。
- 动态避障是基础局部修正和连续安全评估组件，不内置具体机器人尺寸或控制器模型。
- Windows PowerShell 下建议使用 `--example` 或 native `--map` 输入；当前 MoonBit runner 在部分 Windows PowerShell 环境中传递 inline JSON 参数时可能处理其中的双引号，因此本项目不把 PowerShell inline JSON 作为已验证的推荐用法。
- 图片迷宫仅支持正交矩形拓扑；SVG、PDF、occupancy、蜂窝/六边形和斜线主体迷宫尚未支持。
- 151×151 是图片识别和 Canvas 预览上限；逐格 DOM 主地图正式导入上限为 60×60。

## 发布与仓库状态

- mooncakes.io：模块名 `NoEmotionYY/moon-pathplanning`，当前仓库版本号 `0.1.0`。发布状态需通过 `moon add NoEmotionYY/moon-pathplanning` 或 mooncakes.io 页面人工确认；未验证前不标记为已完成。
- GitHub：`https://github.com/NoEmotionYY/moon-pathplanning`。默认分支和最新 CI 状态以远程实际状态为准。
- GitLink：`https://gitlink.org.cn/NoEmotionYY/moon-pathplanning`。同步状态需人工确认。
