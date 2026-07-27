# Moon PathPlanning Web

Vue 3 + TypeScript 可视化前端，直接通过结构化 JSON 调用仓库中的 MoonBit
`web_bridge/plan_json`。路径规划运行于 Web Worker，不阻塞页面主线程。

## 本地开发

需要 Node.js 20+、npm 和 MoonBit 工具链。首次启动：

```bash
cd web
npm install
npm run dev
```

`predev` 会先构建 MoonBit JavaScript target，将生成的 ESM 模块放入
`src/generated/`，并把根目录 `examples/*.json` 复制为 Vite 公共资源。生成文件不会
提交到 Git。

完整验证：

```bash
cd web
npm run type-check
npm run test
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
- 深浅主题、响应式桌面/移动布局、键盘焦点与减少动画支持。

LPA* 与 D* Lite 在当前仓库中仍是阶段版入口：接口和变化单元状态已存在，但每次地图
变化仍会重新生成搜索状态，尚未完整复用上一轮 open list。

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
