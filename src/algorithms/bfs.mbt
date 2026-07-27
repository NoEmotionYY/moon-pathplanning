///|
pub fn bfs(
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
  let mut head = 0
  let mut expanded = 0
  while head < frontier.length() {
    let current = frontier[head]
    head = head + 1
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
  @core.no_path_result(visited.length(), expanded)
}

///|
/// BFS with recorded events from the real queue operations.
pub fn bfs_with_trace(
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
  let mut head = 0
  let mut expanded = 0
  record_event(events, Discovered, map.start, 1)
  while head < frontier.length() {
    let current = frontier[head]
    head = head + 1
    expanded = expanded + 1
    record_event(events, Expanded, current, frontier.length() - head)
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
        record_event(
          events,
          Discovered,
          neighbor.point,
          frontier.length() - head,
        )
      }
    }
  }
  recorded_result(@core.no_path_result(visited.length(), expanded), events)
}
