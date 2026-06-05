///|
fn p(x : Int, y : Int) -> @core.Point {
  @core.point(x, y)
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
pub fn example_names() -> Array[String] {
  [
    "simple_grid", "weighted_grid", "rs_apso_20x20_simple", "rs_apso_20x20_complex",
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
