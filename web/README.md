# Moon PathPlanning Web

Vue 3 + TypeScript 可视化前端，直接通过结构化 JSON 调用仓库中的 MoonBit
`web_bridge/plan_json`。路径规划运行于 Web Worker，不阻塞页面主线程。

## 本地开发

需要 Node.js 20、npm 和 MoonBit 工具链。首次启动：

```bash
cd web
npm ci
npm run dev
```

`predev` 会先构建 MoonBit JavaScript target，将生成的 ESM 模块放入
`src/generated/`，并把根目录 `examples/*.json` 复制为 Vite 公共资源。生成文件不会
提交到 Git。

完整验证：

```bash
cd web
npm ci
npm run type-check
npm test
npm run build
npm run preview
```

也可以在仓库根目录单独构建 Bridge：

```bash
moon check web_bridge --target js
moon test web_bridge --target js
moon build web_bridge_js --target js --release
```

## 架构

```text
PlannerView / GridEditor
        ↓
Pinia stores + usePlanner
        ↓ requestId / mapVersion / algorithm / timeout
plannerWorkerClient
        ↓ run / cancel / trace-batch
planner.worker.ts
        ↓ structured JSON
MoonBit plan_json
        ↓
grid_from_json → planner.plan_with_trace → TracedPathResult
```

### Planner Worker

`usePlanner` 为每次规划固定 `requestId`、`mapVersion` 和算法快照；
`plannerWorkerClient` 管理 Worker 生命周期、超时和硬取消；
`planner.worker.ts` 调用 MoonBit `plan_json`，并把结构化结果和
`trace-batch` 发回主线程。Planner Store 只接受仍匹配当前请求、地图版本和算法的
消息，因此地图导入后到达的旧 progress、Trace 或 completed 消息不会污染新地图。

BFS、DFS、Dijkstra 和 A* 由 MoonBit 搜索循环记录真实 Trace。双向 A*、LPA*、
D* Lite、PSO、RS-APSO、RRT、RRT-Connect 和 RRT* 当前只显示最终路径，不生成
虚假 Trace。

### Maze Import Worker

```text
浏览器 File
  → 安全解码为 ImageMatrix
  → 变换快照
  → mazeImportWorkerClient
  → mazeImport.worker.ts
  → 预处理 / 正交检测 / 拓扑 / 入口 / 2n+1 转换
  → preview 级结果
  → Canvas 结构与地图预览
```

- Worker 只接收浏览器已解码的 `ImageMatrix`，不在 Worker 内解析原始文件。
- 主线程保留原始 RGBA 用于预览；发送前创建一次副本，并 transfer 该副本的
  `ArrayBuffer`，避免转移预览所持有的数据。
- 默认请求 `preview` 级结果，不返回完整积分图等大型中间结构。
- 取消分析时通过 `terminate()` 硬终止 Worker。
- `requestId` 与 `workerGeneration` 共同隔离旧 Worker 的迟到消息。

### 地图导入事务

图片、JSON 文件和内置示例地图最终都通过
`applyMapDocumentTransaction` 替换主地图：

```text
校验文档
  → 检查 mapVersion
  → 检查正式尺寸能力
  → 捕获 Grid / Planner 快照
  → 阻止新 Planner
  → 硬取消旧 Planner
  → 停止 Trace RAF
  → 批量替换地图
  → 清理旧结果
  → 后置校验
  → 成功或回滚
```

成功事务只增加一次 `mapVersion`，默认保留算法选择和回放倍速，并把 Planner、
Path、Trace 和播放状态清理为 idle。事务失败会恢复地图和 Store 快照；已被硬取消
的旧规划任务不会恢复运行。事务锁、版本快照和 Planner 消息校验分别处理 busy、
stale preview 和迟到结果。

## 图片迷宫流程

导入弹窗支持 PNG、JPEG、WebP。图片经过旋转、翻转或反色后，独立 Worker 依次完成
灰度/Alpha 处理、墙体极性与裁剪、正交结构检测、拓扑与通道分析、入口候选选择，
最后按以下规则生成 `GridMapDocument`：

```text
width  = columns × 2 + 1
height = rows × 2 + 1
cell(row, column) → (column × 2 + 1, row × 2 + 1)
```

自动入口不足或置信度不满足要求时，界面保留候选并允许用户选择起点/终点 Pair、交换
方向，再由 Worker 重新生成预览。识别和预览不会修改主地图；只有用户完成二次确认后
才进入原子导入事务，导入后不会自动运行 Planner。完整设计见
[图片迷宫导入设计](../docs/maze-image-import.md)。

- `src/stores/grid.ts`：地图、工具、坐标与地形状态。
- `src/stores/planner.ts`：算法、请求状态、结果、Trace 集合和过期保护。
- `src/stores/preferences.ts`：主题与展示偏好，持久化到 `localStorage`。
- `src/workers/`、`src/services/`：Worker 通信、超时、异常和 Bridge 结果校验。
- `src/types/trace.ts`、`usePlayback.ts`：搜索事件类型与 RAF 播放控制。
- `src/components/grid/GridEditor.vue`：分层网格、SVG 路径和指针编辑。

## 当前能力

- 5×5 到 60×60 的网格编辑，支持障碍、擦除、起点、终点与 2/4/8 地形代价。
- 四方向/八方向移动与 12 种 MoonBit Planner 算法。
- Pointer Capture 连续拖动、Bresenham 跨格补点、确定性画笔和网格内右键取消。
- 单一 polyline 的 SVG 连续路径、深浅主题语义颜色、无路径与错误状态。
- BFS、DFS、Dijkstra 与 A 星真实搜索事件回放，支持暂停、单步、seek 和 0.5×～8× 倍速。
- 路径节点、总代价、访问/展开节点、运行耗时等指标。
- 项目 v1 JSON 导入导出和 5 个原始示例地图。
- PNG、JPEG、WebP 正交迷宫识别、手动入口 Pair、Canvas 预览与正式地图导入。
- 深浅主题、响应式桌面/移动布局、键盘焦点与减少动画支持。

LPA* 与 D* Lite 在当前仓库中仍是阶段版入口：接口和变化单元状态已存在，但每次地图
变化仍会重新生成搜索状态，尚未完整复用上一轮 open list。

## 测试与生产构建

根目录 MoonBit 验证：

```bash
moon fmt --check
moon info
moon check --deny-warn
moon test --deny-warn
moon run cli
moon run ./bench -- --example rs_apso_20x20_simple
```

Web 验证：

```bash
cd web
npm ci
npm run type-check
npm test
npm run build
npm run preview
```

项目没有 ESLint 脚本。`type-check` 与 `build` 的前置脚本会构建 MoonBit JavaScript
Bridge，因此本地环境和 CI Web job 都必须安装 MoonBit。生产构建应生成独立的
Planner Worker 与 Maze Import Worker chunk，输出位于被 Git 忽略的 `web/dist/`。

## GitHub Pages

Vite `base` 已设置为 `/moon-pathplanning/`，Router 使用 Hash History，Worker 和
静态资源通过 Vite URL 处理。推送到 `main` 后，
`.github/workflows/deploy-pages.yml` 会安装 MoonBit、构建 Bridge、测试并部署
`web/dist`。在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**，站点地址为：

```text
https://noemotionyy.github.io/moon-pathplanning/
```

## 已知限制与后续计划

- 双向 A 星、LPA*、D* Lite、PSO、RS-APSO、RRT、RRT-Connect 与 RRT* 当前只显示最终路径，不生成虚假 Trace。
- `iterations` 与 `treeNodes` 在统一 `PathResult` 未暴露时显示 `—`。
- 当前 MoonBit JavaScript target 先完整记录真实事件，再由 Worker 按批次传给主线程；
  这不是 TypeScript 重跑，也不是边计算边直播。`trace-batch` 协议已为后续增量迁移预留。
- 图片导入仅面向横纵墙体组成的正交矩形迷宫；不支持 SVG、PDF、蜂窝/六边形、
  斜线主体迷宫、occupancy 或任意自由形状墙体。
- 图片文件最大 10 MiB，宽高分别不超过 8192，总像素不超过 3200 万。
- 识别和 Canvas 预览转换硬上限为 151×151；正式导入主地图上限为 60×60。
  29×29 逻辑迷宫会生成 59×59，可正式导入；30×30 会生成 61×61，只能预览。
- 主地图仍使用逐格 DOM 渲染；151×151 不是可正式编辑尺寸。

返回[根 README](../README.md)。
