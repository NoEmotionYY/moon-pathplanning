///|
fn status_name(status : @core.SearchStatus) -> String {
  match status {
    @core.Found => "found"
    @core.NoPath => "no_path"
    @core.InvalidInput => "invalid_input"
  }
}

///|
fn point_json(point : @core.Point) -> String {
  "[\{point.x},\{point.y}]"
}

///|
fn path_json(path : Array[@core.Point]) -> String {
  let mut text = "["
  for index, point in path {
    if index > 0 {
      text = text + ","
    }
    text = text + point_json(point)
  }
  text + "]"
}

///|
fn error_code(error : @core.SearchError) -> String {
  match error {
    @core.InvalidDimensions => "INVALID_DIMENSIONS"
    @core.StartOutOfBounds => "START_OUT_OF_BOUNDS"
    @core.GoalOutOfBounds => "GOAL_OUT_OF_BOUNDS"
    @core.ObstacleOutOfBounds => "OBSTACLE_OUT_OF_BOUNDS"
    @core.TerrainOutOfBounds => "TERRAIN_OUT_OF_BOUNDS"
    @core.StartBlocked => "START_BLOCKED"
    @core.GoalBlocked => "GOAL_BLOCKED"
    @core.InvalidTerrainCost => "INVALID_TERRAIN_COST"
    @core.UnsupportedJsonInput => "UNSUPPORTED_JSON_INPUT"
  }
}

///|
fn error_message(error : @core.SearchError) -> String {
  match error {
    @core.InvalidDimensions => "地图尺寸必须为正数"
    @core.StartOutOfBounds => "起点超出地图范围"
    @core.GoalOutOfBounds => "终点超出地图范围"
    @core.ObstacleOutOfBounds => "障碍物超出地图范围"
    @core.TerrainOutOfBounds => "地形单元超出地图范围"
    @core.StartBlocked => "起点不能位于障碍物中"
    @core.GoalBlocked => "终点不能位于障碍物中"
    @core.InvalidTerrainCost => "地形代价必须大于零"
    @core.UnsupportedJsonInput => "当前 JSON 输入格式不受支持"
  }
}

///|
fn quoted(text : String) -> String {
  text.to_json().stringify()
}

///|
fn error_json(code : String, message : String) -> String {
  "{\"code\":\{quoted(code)},\"message\":\{quoted(message)}}"
}

///|
fn failure_json(
  status : String,
  algorithm : String,
  movement : String,
  code : String,
  message : String,
) -> String {
  "{\"success\":false,\"status\":\{quoted(status)},\"algorithm\":\{quoted(algorithm)},\"movement\":\{quoted(movement)},\"path\":[],\"pathNodes\":0,\"totalCost\":0,\"visitedNodes\":0,\"expandedNodes\":0,\"iterations\":null,\"treeNodes\":null,\"trace\":{\"supported\":false,\"mode\":\"none\",\"totalSteps\":0,\"events\":[]},\"error\":\{error_json(code, message)}}"
}

///|
fn result_json(
  traced : @algorithms.TracedPathResult,
  algorithm : String,
  movement : String,
) -> String {
  let result = traced.result
  let error = match result.error {
    Some(value) => error_json(error_code(value), error_message(value))
    None => "null"
  }
  let success = if result.status is @core.Found { "true" } else { "false" }
  "{\"success\":\{success},\"status\":\{quoted(status_name(result.status))},\"algorithm\":\{quoted(algorithm)},\"movement\":\{quoted(movement)},\"path\":\{path_json(result.path)},\"pathNodes\":\{result.path.length()},\"totalCost\":\{result.total_cost},\"visitedNodes\":\{result.visited_nodes},\"expandedNodes\":\{result.expanded_nodes},\"iterations\":null,\"treeNodes\":null,\"trace\":\{trace_json(traced.trace)},\"error\":\{error}}"
}
