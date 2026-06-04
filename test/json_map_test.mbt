///|
test "json exporter writes v1 grid fields" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1))
  let json = @json_map.grid_to_json(map, @grid.FourWay)
  assert_eq(
    json, "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":2,\"height\":2,\"start\":[0,0],\"goal\":[1,1],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}",
  )
  assert_eq(@json_map.grid_format_version(), "moon-pathplanning.grid.v1")
}
