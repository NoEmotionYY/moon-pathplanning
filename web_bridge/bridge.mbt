///|
fn algorithm_from_name(name : String) -> @planner.AlgorithmType? {
  match name {
    "bfs" => Some(@planner.Bfs)
    "dfs" => Some(@planner.Dfs)
    "dijkstra" => Some(@planner.Dijkstra)
    "astar" => Some(@planner.AStar)
    "bidirectional_astar" => Some(@planner.BidirectionalAStar)
    "lpa_star" => Some(@planner.LpaStar)
    "d_star_lite" => Some(@planner.DStarLite)
    "pso" => Some(@planner.Pso)
    "rs_apso" => Some(@planner.RsApso)
    "rrt" => Some(@planner.Rrt)
    "rrt_connect" => Some(@planner.RrtConnect)
    "rrt_star" => Some(@planner.RrtStar)
    _ => None
  }
}

///|
fn movement_name(movement : @grid.MovementMode) -> String {
  match movement {
    @grid.FourWay => "four_way"
    @grid.EightWay => "eight_way"
  }
}

///|
fn heuristic_for(movement : @grid.MovementMode) -> @heuristics.HeuristicKind {
  match movement {
    @grid.FourWay => @heuristics.Manhattan
    @grid.EightWay => @heuristics.Octile
  }
}

///|
fn request_field(object : Map[String, Json], name : String) -> Json? {
  object.get(name)
}

///|
fn request_algorithm(object : Map[String, Json]) -> String? {
  match request_field(object, "algorithm") {
    Some(String(value)) => Some(value)
    _ => None
  }
}

///|
fn invalid_request(
  algorithm? : String = "unknown",
  code? : String = "INVALID_REQUEST",
  message? : String = "请求格式无效",
) -> String {
  failure_json("invalid_input", algorithm, "unknown", code, message)
}

///|
/// Structured Web entry point. The exported JavaScript function accepts and
/// returns JSON strings, keeping the browser independent of CLI text output.
pub fn plan_json(input : String) -> String {
  let json = @json.parse(input) catch {
    _ =>
      return invalid_request(
        code="INVALID_JSON",
        message="无法解析请求 JSON",
      )
  }
  let object : Map[String, Json] = @json.from_json(json) catch {
    _ => return invalid_request(message="请求根节点必须是 JSON 对象")
  }
  let algorithm_name = match request_algorithm(object) {
    Some(value) => value
    None => return invalid_request(message="缺少有效的 algorithm 字段")
  }
  let algorithm = match algorithm_from_name(algorithm_name) {
    Some(value) => value
    None =>
      return invalid_request(
        algorithm=algorithm_name,
        code="UNSUPPORTED_ALGORITHM",
        message="不支持的路径规划算法：\{algorithm_name}",
      )
  }
  let map_json = match request_field(object, "map") {
    Some(value) => value.stringify()
    None =>
      return invalid_request(
        algorithm=algorithm_name,
        code="INVALID_MAP",
        message="缺少 map 字段",
      )
  }
  let data = match @json_map.grid_from_json(map_json) {
    Some(value) => value
    None =>
      return invalid_request(
        algorithm=algorithm_name,
        code="INVALID_MAP",
        message="地图字段或格式无效",
      )
  }
  let movement = movement_name(data.movement)
  if data.map.width < 5 ||
    data.map.height < 5 ||
    data.map.width > 60 ||
    data.map.height > 60 {
    return failure_json(
      "invalid_input", algorithm_name, movement, "INVALID_DIMENSIONS", "地图尺寸必须在 5×5 到 60×60 之间",
    )
  }
  match data.map.validate() {
    Some(error) =>
      failure_json(
        "invalid_input",
        algorithm_name,
        movement,
        error_code(error),
        error_message(error),
      )
    None => {
      let options = @planner.options(
        data.movement,
        heuristic_for(data.movement),
      )
      let traced = @planner.plan_with_trace(data.map, algorithm, options)
      result_json(traced, algorithm_name, movement)
    }
  }
}
