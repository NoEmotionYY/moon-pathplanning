# 示例

## 地图文件

- `simple_grid.json` 演示四方向障碍绕行。
- `weighted_grid.json` 演示八方向地图、障碍物和 terrain cost。

两个文件都使用 `moon-pathplanning.grid.v1` schema。`start`、`goal`、
`obstacles` 与 terrain 中的 `point` 都写成 `[x, y]`。

## CLI demo

安装 MoonBit 工具链后，在仓库根目录运行：

```bash
moon run cli
```

当前 CLI 使用内置 demo 地图，展示 Planner 对 A 星算法的调度结果。文件型 JSON CLI
导入需要等待完整 JSON 解析边界验证后补充。

## SVG

调用 `@svg.grid_to_svg(map, result.path, cell_size)` 可得到 SVG 字符串。该导出适合
在示例程序或展示层写入文件，仓库只保留导出代码，不保留大批生成图片。

