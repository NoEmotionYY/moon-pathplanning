# Moon PathPlanning

Moon PathPlanning is a MoonBit path planning library for reusable grid search
algorithms, map models, examples, tests, and visualization output.

## 背景

本项目面向机器人路径规划、游戏地图寻路、网格导航、算法教学和确定性仿真。
项目参考 `zhm-real/PathPlanning` 的算法主题与案例范围；参考项目采用 MIT
License。本仓库会用 MoonBit 原生包结构重组核心能力，不直接照搬 Python
脚本式实现。

## 当前阶段

- 建立 MoonBit 工程结构、执行日志和许可证。
- 逐步实现网格地图、图结构、搜索算法、测试、示例和可视化导出。
- 高级增量规划与采样规划算法将在路线图中继续拆解。

## 示例地图格式

`examples/simple_grid.json` 与 `examples/weighted_grid.json` 使用
`moon-pathplanning.grid.v1` schema，包含网格尺寸、端点、移动模式、障碍物和
terrain cost。当前 `src/io/json_map.mbt` 已提供可测试 JSON 序列化；完整 JSON
文件解析会在 MoonBit 工具链与 JSON 依赖边界可验证后继续补齐。

## License

This project is released under the MIT License. See `LICENSE`.
