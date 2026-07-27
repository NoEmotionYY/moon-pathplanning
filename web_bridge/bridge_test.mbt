///|
let open_map = "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":5,\"height\":5,\"start\":[0,0],\"goal\":[4,4],\"movement\":\"four_way\",\"obstacles\":[],\"terrain\":[]}"

///|
test "web bridge plans a valid A star request" {
  let response = plan_json("{\"algorithm\":\"astar\",\"map\":\{open_map}}")
  assert_true(response.contains("\"success\":true"))
  assert_true(response.contains("\"status\":\"found\""))
  assert_true(response.contains("\"algorithm\":\"astar\""))
  assert_true(response.contains("\"trace\":{\"supported\":true"))
  assert_true(response.contains("\"mode\":\"recorded\""))
  assert_true(response.contains("\"kind\":\"discovered\""))
  assert_true(response.contains("\"frontierSize\":"))
}

///|
test "web bridge reports malformed JSON" {
  let response = plan_json("{bad")
  assert_true(response.contains("\"code\":\"INVALID_JSON\""))
  assert_true(response.contains("\"success\":false"))
}

///|
test "web bridge reports unsupported algorithm" {
  let response = plan_json("{\"algorithm\":\"magic\",\"map\":\{open_map}}")
  assert_true(response.contains("\"code\":\"UNSUPPORTED_ALGORITHM\""))
}

///|
test "web bridge reports no trace support without fabricating events" {
  let response = plan_json("{\"algorithm\":\"rrt\",\"map\":\{open_map}}")
  assert_true(response.contains("\"trace\":{\"supported\":false"))
  assert_true(response.contains("\"mode\":\"none\""))
  assert_true(response.contains("\"events\":[]"))
}

///|
test "web bridge reports blocked start" {
  let blocked = "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":5,\"height\":5,\"start\":[0,0],\"goal\":[4,4],\"movement\":\"four_way\",\"obstacles\":[[0,0]],\"terrain\":[]}"
  let response = plan_json("{\"algorithm\":\"astar\",\"map\":\{blocked}}")
  assert_true(response.contains("\"code\":\"START_BLOCKED\""))
}

///|
test "web bridge reports no path with stable fields" {
  let blocked = "{\"format\":\"moon-pathplanning.grid.v1\",\"width\":5,\"height\":5,\"start\":[0,0],\"goal\":[4,4],\"movement\":\"four_way\",\"obstacles\":[[0,1],[1,0]],\"terrain\":[]}"
  let response = plan_json("{\"algorithm\":\"astar\",\"map\":\{blocked}}")
  assert_true(response.contains("\"status\":\"no_path\""))
  assert_true(response.contains("\"pathNodes\":0"))
  assert_true(response.contains("\"iterations\":null"))
  assert_true(response.contains("\"trace\":{\"supported\":true"))
  assert_true(response.contains("\"events\":["))
}
