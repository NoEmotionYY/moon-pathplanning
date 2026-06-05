# 示例

## 地图文件

- `simple_grid.json` 演示四方向障碍绕行。
- `weighted_grid.json` 演示八方向地图、障碍物和 terrain cost。
- `rs_apso_20x20_simple.json` 演示论文风格 20x20 简单静态栅格。
- `rs_apso_20x20_complex.json` 演示论文风格 20x20 复杂静态栅格、狭窄通道和 terrain cost。

这些文件都使用 `moon-pathplanning.grid.v1` schema。`start`、`goal`、
`obstacles` 与 terrain 中的 `point` 都写成 `[x, y]`。
20x20 RS-APSO 文件用于固定项目内 benchmark 输入，是根据论文实验尺寸和障碍复杂度整理的
代表性场景，不声称逐像素复刻论文图 8 与图 9。
库内可用 `@json_map.grid_from_json(text)` 解析同一 schema 的 JSON 字符串；CLI 和 benchmark
runner 可通过 `--json/-j` 直接接收 JSON 字符串，CLI 也可在 native 后端读取这些 JSON 文件。

可以通过仓库根目录的 `moon run ./bench` 运行当前 benchmark runner。runner 会复用这两类
20x20 场景，输出 A 星、Dijkstra、PSO 和 RS-APSO 的 CSV 指标，并记录默认 5 次重复运行、
总耗时和平均耗时；同时输出 `dynamic_5x1`、`dynamic_10x10_crossing` 与
`dynamic_12x12_mixed` 动态避障场景，用于
对比静态 A 星基线、整数速度、边界往复、连续安全感知修正和连续等待修正。连续动态行还会记录
`safety_evaluated`、`continuous_safe` 和 `min_clearance`，其中 `dynamic_continuous_wait`
展示狭窄通道中的原地等待策略，`dynamic_12x12_mixed` 展示带静态障碍的混合动态组合。也可以在 native 后端直接指定 JSON 文件，例如
`moon run ./bench --target native -- examples/simple_grid.json` 或
`moon run ./bench --target native -- --map examples/weighted_grid.json`。
不依赖文件系统的字符串输入可使用 `moon run ./bench -- --json <grid-json>`。

## CLI demo

安装 MoonBit 工具链后，在仓库根目录运行：

```bash
moon run cli
```

当前 CLI 使用内置 demo 地图，展示 Planner 对 A 星算法的调度结果。文件型 JSON CLI
导入使用 native 后端；字符串型 JSON 输入可用 `--json/-j`：

```bash
moon run cli -- --json '{\"format\":\"moon-pathplanning.grid.v1\",\"width\":3,\"height\":3,\"start\":[0,0],\"goal\":[2,2],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}'
moon run cli --target native -- examples/simple_grid.json
moon run cli --target native -- --map examples/weighted_grid.json
```

## SVG

调用 `@svg.grid_to_svg(map, result.path, cell_size)` 可得到 SVG 字符串。该导出适合
在示例程序或展示层写入文件。调试 RS-APSO 区域搜索时，可调用
`@svg.grid_region_to_svg(map, region, result.path, cell_size)` 叠加候选搜索区域和障碍物
边界角。仓库只保留导出代码，不保留大批生成图片。
