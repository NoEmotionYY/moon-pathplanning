///|
fn p(x : Int, y : Int) -> @core.Point {
  @core.point(x, y)
}

///|
fn push_h(cells : Array[@core.Point], y : Int, x1 : Int, x2 : Int) -> Unit {
  for x in x1..<=x2 {
    cells.push(p(x, y))
  }
}

///|
fn push_v(cells : Array[@core.Point], x : Int, y1 : Int, y2 : Int) -> Unit {
  for y in y1..<=y2 {
    cells.push(p(x, y))
  }
}

///|
fn has_point(cells : Array[@core.Point], x : Int, y : Int) -> Bool {
  for cell in cells {
    if cell.x == x && cell.y == y {
      return true
    }
  }
  false
}

///|
fn simple_grid_data() -> GridJsonData {
  {
    map: @grid.new_grid(6, 5, p(0, 0), p(5, 4)).with_obstacles([
      p(1, 1),
      p(1, 2),
      p(2, 2),
      p(4, 3),
    ]),
    movement: @grid.FourWay,
  }
}

///|
fn weighted_grid_data() -> GridJsonData {
  {
    map: @grid.new_grid(7, 5, p(0, 2), p(6, 2))
    .with_obstacles([p(2, 1), p(2, 2), p(2, 3), p(4, 1)])
    .with_terrain(p(3, 2), 6.0)
    .with_terrain(p(4, 2), 4.0)
    .with_terrain(p(5, 1), 2.0),
    movement: @grid.EightWay,
  }
}

///|
fn rs_apso_simple_data() -> GridJsonData {
  {
    map: @grid.new_grid(20, 20, p(0, 0), p(19, 19)).with_obstacles([
      p(4, 2),
      p(4, 3),
      p(4, 4),
      p(4, 5),
      p(4, 6),
      p(4, 7),
      p(8, 5),
      p(9, 5),
      p(10, 5),
      p(11, 5),
      p(12, 5),
      p(13, 5),
      p(15, 3),
      p(15, 4),
      p(15, 5),
      p(12, 9),
      p(12, 10),
      p(12, 11),
      p(12, 12),
      p(12, 13),
      p(12, 14),
      p(16, 10),
      p(17, 10),
      p(18, 10),
      p(3, 13),
      p(4, 13),
      p(5, 13),
      p(6, 13),
      p(7, 13),
      p(9, 16),
      p(10, 16),
      p(11, 16),
      p(12, 16),
      p(13, 16),
    ]),
    movement: @grid.EightWay,
  }
}

///|
fn rs_apso_complex_data() -> GridJsonData {
  {
    map: @grid.new_grid(20, 20, p(0, 0), p(19, 19))
    .with_obstacles([
      p(3, 1),
      p(3, 2),
      p(3, 3),
      p(3, 5),
      p(3, 6),
      p(3, 7),
      p(3, 8),
      p(3, 9),
      p(3, 11),
      p(3, 12),
      p(3, 13),
      p(3, 14),
      p(3, 15),
      p(7, 4),
      p(7, 5),
      p(7, 6),
      p(7, 7),
      p(7, 9),
      p(7, 10),
      p(7, 11),
      p(7, 12),
      p(7, 13),
      p(7, 14),
      p(7, 16),
      p(7, 17),
      p(7, 18),
      p(7, 19),
      p(11, 0),
      p(11, 1),
      p(11, 2),
      p(11, 3),
      p(11, 4),
      p(11, 5),
      p(11, 7),
      p(11, 8),
      p(11, 9),
      p(11, 10),
      p(11, 11),
      p(11, 13),
      p(11, 14),
      p(15, 5),
      p(15, 6),
      p(15, 7),
      p(15, 8),
      p(15, 10),
      p(15, 11),
      p(15, 12),
      p(15, 13),
      p(15, 14),
      p(15, 15),
      p(15, 17),
      p(15, 18),
      p(15, 19),
      p(5, 3),
      p(6, 3),
      p(7, 3),
      p(8, 3),
      p(10, 3),
      p(12, 3),
      p(13, 3),
      p(15, 3),
      p(16, 3),
      p(17, 3),
      p(0, 8),
      p(1, 8),
      p(4, 8),
      p(5, 8),
      p(7, 8),
      p(8, 8),
      p(9, 8),
      p(12, 8),
      p(13, 8),
      p(6, 13),
      p(8, 13),
      p(9, 13),
      p(10, 13),
      p(12, 13),
      p(13, 13),
      p(14, 13),
      p(16, 13),
      p(18, 13),
      p(19, 13),
    ])
    .with_terrain(p(5, 5), 3.0)
    .with_terrain(p(6, 6), 3.0)
    .with_terrain(p(10, 10), 5.0)
    .with_terrain(p(14, 14), 4.0)
    .with_terrain(p(17, 16), 2.5),
    movement: @grid.EightWay,
  }
}

///|
fn complex_maze_open_cells() -> Array[@core.Point] {
  let cells = []
  push_h(cells, 1, 1, 5)
  push_v(cells, 5, 1, 5)
  push_h(cells, 5, 5, 9)
  push_v(cells, 9, 3, 9)
  push_h(cells, 9, 3, 9)
  push_v(cells, 3, 9, 15)
  push_h(cells, 15, 3, 13)
  push_v(cells, 13, 11, 15)
  push_h(cells, 11, 13, 19)
  push_v(cells, 19, 7, 11)
  push_h(cells, 7, 15, 19)
  push_v(cells, 15, 7, 19)
  push_h(cells, 19, 15, 21)
  push_v(cells, 21, 17, 23)
  push_h(cells, 23, 21, 23)
  push_v(cells, 1, 1, 7)
  push_h(cells, 7, 1, 7)
  push_v(cells, 7, 7, 13)
  push_h(cells, 13, 7, 11)
  push_v(cells, 11, 13, 17)
  push_h(cells, 17, 5, 11)
  push_v(cells, 5, 17, 21)
  push_h(cells, 21, 5, 13)
  push_v(cells, 13, 19, 21)
  push_h(cells, 3, 1, 3)
  push_v(cells, 3, 3, 5)
  push_h(cells, 3, 7, 11)
  push_v(cells, 11, 1, 5)
  push_h(cells, 1, 11, 17)
  push_v(cells, 17, 1, 5)
  push_h(cells, 5, 13, 17)
  push_h(cells, 9, 11, 17)
  push_v(cells, 17, 9, 13)
  push_h(cells, 13, 15, 21)
  push_v(cells, 21, 9, 15)
  push_h(cells, 15, 17, 23)
  push_v(cells, 23, 13, 23)
  push_h(cells, 3, 19, 23)
  push_v(cells, 23, 1, 7)
  push_h(cells, 7, 21, 23)
  push_v(cells, 7, 17, 23)
  push_h(cells, 23, 1, 7)
  push_v(cells, 1, 17, 23)
  push_h(cells, 19, 1, 7)
  push_h(cells, 11, 1, 3)
  push_h(cells, 11, 5, 7)
  push_h(cells, 17, 15, 19)
  push_v(cells, 9, 17, 21)
  push_h(cells, 21, 9, 17)
  push_v(cells, 17, 17, 21)
  cells
}

///|
fn complex_maze_obstacles() -> Array[@core.Point] {
  let open = complex_maze_open_cells()
  let obstacles = []
  for y in 0..<25 {
    for x in 0..<25 {
      if !has_point(open, x, y) {
        obstacles.push(p(x, y))
      }
    }
  }
  obstacles
}

///|
fn complex_maze_data() -> GridJsonData {
  {
    map: @grid.new_grid(25, 25, p(1, 1), p(23, 23)).with_obstacles(
      complex_maze_obstacles(),
    ),
    movement: @grid.FourWay,
  }
}

///|
pub fn example_names() -> Array[String] {
  [
    "simple_grid", "weighted_grid", "rs_apso_20x20_simple", "rs_apso_20x20_complex",
    "complex_maze",
  ]
}

///|
pub fn example_grid_data(name : String) -> GridJsonData? {
  match name {
    "simple"
    | "simple_grid"
    | "simple_grid.json"
    | "examples/simple_grid.json"
    | "examples\\simple_grid.json" => Some(simple_grid_data())
    "weighted"
    | "weighted_grid"
    | "weighted_grid.json"
    | "examples/weighted_grid.json"
    | "examples\\weighted_grid.json" => Some(weighted_grid_data())
    "rs_apso_simple"
    | "rs_apso_20x20_simple"
    | "rs_apso_20x20_simple.json"
    | "examples/rs_apso_20x20_simple.json"
    | "examples\\rs_apso_20x20_simple.json" => Some(rs_apso_simple_data())
    "rs_apso_complex"
    | "rs_apso_20x20_complex"
    | "rs_apso_20x20_complex.json"
    | "examples/rs_apso_20x20_complex.json"
    | "examples\\rs_apso_20x20_complex.json" => Some(rs_apso_complex_data())
    "maze"
    | "complex_maze"
    | "complex_maze.json"
    | "examples/complex_maze.json"
    | "examples\\complex_maze.json" => Some(complex_maze_data())
    _ => None
  }
}

///|
pub fn example_json(name : String) -> String? {
  match example_grid_data(name) {
    Some(data) => Some(grid_to_json(data.map, data.movement))
    None => None
  }
}
