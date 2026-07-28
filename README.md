# Moon PathPlanning v0.2.0

![MoonBit](https://img.shields.io/badge/MoonBit-path%20planning-orange)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Moon PathPlanning 是一个基于 **MoonBit** 实现的路径规划工程项目，包含路径规划核心库、CLI 工具、benchmark、SVG/HTML 导出以及 Vue 3 Web 可视化系统。

项目重点不是简单实现 A*，而是构建一个完整的路径规划实验平台：

- MoonBit 原生路径规划算法库
- Vue 3 + TypeScript 可视化界面
- Web Worker 调度规划任务
- 图片迷宫自动识别与地图导入
- 多算法 benchmark 与结果分析

在线体验：

https://noemotionyy.github.io/moon-pathplanning/

---

## ✨ v0.2.0 新特性

### Web 可视化平台

- Vue 3 + TypeScript + Vite + Pinia
- 交互式网格编辑器
- 起点、终点、障碍物、terrain cost 编辑
- 四方向 / 八方向移动模式
- 深浅主题与响应式布局
- JSON 地图导入导出

### 图片迷宫导入

支持：

```
PNG / JPEG / WebP
        ↓
图片分析
        ↓
正交迷宫检测
        ↓
拓扑恢复
        ↓
入口候选分析
        ↓
GridMapDocument
        ↓
路径规划
```

支持旋转、翻转、反色、透明背景处理以及人工确认入口。

当前限制：

- 正交矩形迷宫
- 正式编辑地图最大 60×60
- 预览最大 151×151

---

## 🧠 核心算法

完整支持：

- BFS
- DFS
- Dijkstra
- A*
- Bidirectional A*

基础实现：

- PSO
- RS-APSO
- RRT
- RRT-Connect
- RRT*

阶段入口：

- LPA*
- D* Lite

说明：LPA*/D* Lite 当前保留统一接口和状态结构，用于后续增量状态复用开发，并非完整工业级增量规划器。

---

## 🏗️ 技术架构

```text
Vue 3
 │
Pinia Store
 │
Planner Worker
 │
MoonBit JavaScript Bridge
 │
MoonBit Planner Engine
 │
PathResult / Trace
```

前端不会重新实现算法，而是调用 MoonBit 编译生成的 JavaScript Bridge。

---

## 🎮 Web功能

当前支持：

- 网格编辑
- 算法选择
- 路径可视化
- BFS/DFS/Dijkstra/A* 搜索过程回放
- 暂停、单步、seek、倍速播放
- 图片迷宫导入
- JSON 地图管理
- 错误状态反馈

---

## 🚀 快速开始

### MoonBit

```bash
moon check
moon test
moon run cli
```

示例：

```bash
moon run cli -- --example weighted_grid

moon run cli -- --algorithm astar --example complex_maze
```

### Web

```bash
cd web
npm ci
npm run dev
```

生产构建：

```bash
npm run type-check
npm test
npm run build
```

---

## 📊 Benchmark

benchmark 支持：

- A*
- Dijkstra
- PSO
- RS-APSO
- RRT
- RRT-Connect
- RRT*

输出指标包括：

- 路径长度
- 平滑度
- 搜索节点数量
- 运行时间
- 采样树节点
- 动态避障安全指标

---

## 🧪 测试

CI 自动执行：

- MoonBit 格式检查
- moon check
- moon test
- CLI smoke test
- Web 类型检查
- Web 单元测试
- Web build

---

## 📌 项目定位

适用于：

- 机器人路径规划研究
- 游戏地图寻路
- 算法教学
- 路径规划可视化
- MoonBit 工程实践

不定位为：

- 完整工业机器人导航系统
- 自动驾驶规划系统
- ROS2 生产导航框架

---

## 🗺️ Roadmap

- [x] GridMap 与经典搜索算法
- [x] CLI 与 benchmark
- [x] Vue 3 可视化
- [x] 图片迷宫导入
- [x] Web Worker 架构
- [ ] Canvas 大地图渲染
- [ ] 真正 LPA*/D* Lite 增量规划
- [ ] ROS2 / Unity 集成
- [ ] 云端实验管理

---

## License

MIT License
