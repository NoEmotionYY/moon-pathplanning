///|
pub fn dfs(map : @grid.GridMap, movement : @grid.MovementMode) -> @core.PathResult {
  match map.validate() {
    Some(error) => return @core.invalid_result(error)
    None => ()
  }
  if map.start.same(map.goal) {
    return @core.found_result([map.start], 0.0, 1, 0)
  }
  let frontier = [map.start]
  let visited = [map.start]
  let parents = []
  let mut expanded = 0
  while !frontier.is_empty() {
    match frontier.pop() {
      Some(current) => {
        expanded = expanded + 1
        if current.same(map.goal) {
          return @core.found_result(
            point_path(parents, map.start, map.goal),
            path_cost(parents, map.start, map.goal),
            visited.length(),
            expanded,
          )
        }
        for neighbor in map.neighbors(current, movement) {
          if !contains_point(visited, neighbor.point) {
            visited.push(neighbor.point)
            frontier.push(neighbor.point)
            set_parent(parents, neighbor.point, current, neighbor.cost)
          }
        }
      }
      None => ()
    }
  }
  @core.no_path_result(visited.length(), expanded)
}

