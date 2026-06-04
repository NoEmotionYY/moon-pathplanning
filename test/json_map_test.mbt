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
