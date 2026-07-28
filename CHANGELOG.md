# Changelog

## 0.2.0 - 2026-07-28

### Added

- Vue 3 + TypeScript Web 可视化平台。
- Planner Worker 与 MoonBit JavaScript Bridge 调用链。
- PNG/JPEG/WebP 图片迷宫识别与 GridMap 导入。
- 多算法路径规划展示、JSON 地图导入导出和 benchmark 支持。

### Changed

- 项目版本升级至 v0.2.0。
- README 重新设计，突出工程架构、能力边界和路线图。
- 明确经典算法、高级基础实现和阶段入口的能力范围。

### Notes

- LPA*/D* Lite 当前为阶段入口，不代表完整增量规划实现。
- 主地图编辑仍保持 60×60 上限。

## Unreleased

### Web 可视化与图片迷宫导入

- 新增 Vue 3、TypeScript、Vite 和 Pinia Web 可视化，支持网格编辑、深浅主题、响应式布局、JSON 导入导出和内置示例地图。
- 新增独立 Planner Worker，通过 MoonBit JavaScript Bridge 执行规划，并支持 BFS、DFS、Dijkstra、A* 的真实搜索 Trace 回放。
- 新增 PNG、JPEG、WebP 安全读取、Alpha/透明背景处理，以及旋转、翻转和反色变换。
- 新增正交迷宫结构检测、墙体极性与入口候选分析。

## 0.1.0 - 2026-05-23

- 初始化 MoonBit 模块、MIT License、中文执行日志和工程文档。
- 实现网格地图、移动模式、terrain cost、加权图与启发函数。
- 实现 BFS、DFS、Dijkstra、A 星、双向 A 星和统一 Planner。
