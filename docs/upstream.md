# 上游来源与许可证说明

## 上游项目

- 名称：PathPlanning
- 仓库：https://github.com/zhm-real/PathPlanning
- 许可证：MIT License

## 本项目参考内容

Moon PathPlanning 参考了上游项目的路径规划问题域、算法主题和示例组织方向，包括网格路径规划、经典搜索、采样规划、动态避障和可视化展示这类能力边界。

本项目没有把上游 Python 脚本逐文件翻译为 MoonBit，也没有复用上游目录结构作为实现结构。当前 MoonBit 代码按本仓库的包结构、类型模型、测试方式和 CLI/benchmark 入口重新组织。

## 未直接复制的内容

- 未直接复制上游 Python 源码文件。
- 未直接复制上游动画脚本。
- 未直接复制上游测试数据集。
- 未直接复制上游生成图片或视频资源。

## 示例地图、测试数据和参数

仓库内 `examples/*.json` 是为本项目测试、CLI 和 benchmark 固化的 Moon PathPlanning JSON v1 输入。它们用于覆盖简单网格、权重地图、RS-APSO 20x20 场景和动态避障 benchmark，不声明来自上游仓库的原始数据文件。

PSO/RS-APSO 的默认权重、固定 seed、种群规模和迭代次数用于本项目可复现测试与 benchmark。相关实现是离散基础版本，不声明覆盖论文或上游项目中的全部参数体系。

## MoonBit 独立实现范围

- MoonBit 原生 `GridMap`、`Point`、`PathResult`、错误类型和合法性检查。
- BFS、DFS、Dijkstra、A*、双向 A*。
- LPA*/D* Lite 阶段入口和变化单元记录。
- 区域搜索、离散 PSO/RS-APSO 基础实现。
- 基础栅格采样 RRT、RRT-Connect、RRT*。
- 动态避障基础组件。
- JSON v1、CLI、SVG/HTML 导出和 benchmark runner。

本项目采用 MIT License，与上游 MIT License 兼容；根目录 `LICENSE` 是本项目许可证文本。
