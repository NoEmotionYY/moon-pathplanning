///|
test "json exporter writes v1 grid fields" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1))
  let json = @json_map.grid_to_json(map, @grid.FourWay)
  assert_eq(
    json, "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":2,\"height\":2,\"start\":[0,0],\"goal\":[1,1],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}",
  )
  assert_eq(@json_map.grid_format_version(), "moon-pathplanning.grid.v1")
}

///|
test "json importer reads v1 grid fields" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
    .with_obstacle(@core.point(1, 1))
    .with_terrain(@core.point(2, 1), 4.0)
  let text = @json_map.grid_to_json(map, @grid.EightWay)
  let parsed = @json_map.grid_from_json(text)
  assert_eq(parsed is Some(_), true)
  match parsed {
    Some(data) => {
      assert_eq(data.movement is @grid.EightWay, true)
      assert_eq(data.map.width, 3)
      assert_eq(data.map.height, 3)
      assert_eq(data.map.start.same(@core.point(0, 0)), true)
      assert_eq(data.map.goal.same(@core.point(2, 2)), true)
      assert_eq(data.map.is_obstacle(@core.point(1, 1)), true)
      assert_eq(data.map.terrain_cost(@core.point(2, 1)), 4.0)
    }
    None => ()
  }
}

///|
test "json importer rejects unsupported schema" {
  let parsed = @json_map.grid_from_json("{\"format\":\"other\"}")
  assert_eq(parsed is None, true)
}

///|
test "json importer preserves invalid map for validation" {
  let text = "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":2,\"height\":2,\"start\":[0,0],\"goal\":[1,1],\"movement\":\"four_way\",\"obstacles\":[[2,1]],\"terrain\":[]}"
  match @json_map.grid_from_json(text) {
    Some(data) =>
      assert_eq(data.map.validate() is Some(@core.ObstacleOutOfBounds), true)
    None => fail("expected structurally valid JSON to parse")
  }
}

///|
test "json invalid map enters planner as invalid input" {
  let text = "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":2,\"height\":2,\"start\":[0,0],\"goal\":[1,1],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[{\"point\":[1,2],\"cost\":1.0}]}"
  match @json_map.grid_from_json(text) {
    Some(data) => {
      let result = @planner.plan(
        data.map,
        @planner.AStar,
        @planner.default_options(),
      )
      assert_eq(result.status is @core.InvalidInput, true)
      assert_eq(result.error is Some(@core.TerrainOutOfBounds), true)
    }
    None => fail("expected structurally valid JSON to parse")
  }
}

///|
test "json embedded examples parse without filesystem" {
  let names = @json_map.example_names()
  assert_eq(names.length(), 5)
  match @json_map.example_json("simple_grid") {
    Some(text) =>
      match @json_map.grid_from_json(text) {
        Some(data) => {
          assert_eq(data.map.width, 6)
          assert_eq(data.map.height, 5)
          assert_eq(data.movement is @grid.FourWay, true)
        }
        None => fail("expected simple embedded example to parse")
      }
    None => fail("expected simple embedded example")
  }
  match @json_map.example_grid_data("examples/rs_apso_20x20_complex.json") {
    Some(data) => {
      assert_eq(data.map.width, 20)
      assert_eq(data.map.height, 20)
      assert_eq(data.map.obstacles.length(), 82)
      assert_eq(data.map.terrain.length(), 5)
      assert_eq(data.movement is @grid.EightWay, true)
    }
    None => fail("expected complex embedded example")
  }
  match @json_map.example_grid_data("complex_maze") {
    Some(data) => {
      assert_eq(data.map.width, 25)
      assert_eq(data.map.height, 25)
      assert_eq(data.map.start.same(@core.point(1, 1)), true)
      assert_eq(data.map.goal.same(@core.point(23, 23)), true)
      assert_eq(data.map.obstacles.length(), 385)
      assert_eq(data.movement is @grid.FourWay, true)
    }
    None => fail("expected complex maze embedded example")
  }
  assert_eq(@json_map.example_json("missing") is None, true)
}
