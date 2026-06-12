# 从 PathPlanning 迁移

## 参考范围

Moon PathPlanning 参考 `zhm-real/PathPlanning` 的公开算法主题、路径规划问题域和
示例组织思路。参考项目采用 MIT License，本项目也采用 MIT License，并在 README
和许可证文件中保留清晰的许可说明。

## 不是脚本复制

本仓库不会复制参考项目的大量 Python 脚本，也不会把 Python 目录结构逐文件翻译成
MoonBit。移植工作关注算法能力，而实现采用 MoonBit 原生类型、包描述文件、测试
块和可复用模块边界。

## 优先移植能力

- 二维网格地图、障碍物和地形代价。
- BFS、DFS、Dijkstra、A 星与双向 A 星。
- Manhattan、Euclidean、Chebyshev 和 Octile 启发函数。
- 统一 Planner、JSON 示例 schema 与 SVG 可视化导出。

## 后续迁移能力

- 增量规划：LPA* 和 D* Lite。
- 采样规划：基础 RRT、RRT-Connect 和 RRT* 已开始并接入静态 benchmark CSV，后续继续补 SVG 可视化对比。
- 更完整的连续空间案例、跨后端文件输入策略、发布与生态适配。

## Attribution

`zhm-real/PathPlanning` 为 MIT 许可项目。本项目使用路径规划领域通用算法思想并
对该参考来源做归属说明；本仓库中的 MoonBit 源码、测试与文档按当前工程重新编写。
