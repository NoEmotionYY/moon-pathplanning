///|
pub fn dfs(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
) -> @core.PathResult {
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

///|
/// DFS with recorded events from the real stack operations.
pub fn dfs_with_trace(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
) -> TracedPathResult {
  let events = []
  match map.validate() {
    Some(error) => return recorded_result(@core.invalid_result(error), events)
    None => ()
  }
  if map.start.same(map.goal) {
    record_event(events, Discovered, map.start, 1)
    return recorded_result(@core.found_result([map.start], 0.0, 1, 0), events)
  }
  let frontier = [map.start]
  let visited = [map.start]
  let parents = []
  let mut expanded = 0
  record_event(events, Discovered, map.start, 1)
  while !frontier.is_empty() {
    match frontier.pop() {
      Some(current) => {
        expanded = expanded + 1
        record_event(events, Expanded, current, frontier.length())
        if current.same(map.goal) {
          return recorded_result(
            @core.found_result(
              point_path(parents, map.start, map.goal),
              path_cost(parents, map.start, map.goal),
              visited.length(),
              expanded,
            ),
            events,
          )
        }
        for neighbor in map.neighbors(current, movement) {
          if !contains_point(visited, neighbor.point) {
            visited.push(neighbor.point)
            frontier.push(neighbor.point)
            set_parent(parents, neighbor.point, current, neighbor.cost)
            record_event(events, Discovered, neighbor.point, frontier.length())
          }
        }
      }
      None => ()
    }
  }
  recorded_result(@core.no_path_result(visited.length(), expanded), events)
}
