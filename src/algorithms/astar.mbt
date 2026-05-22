///|
pub fn astar(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> @core.PathResult {
  match map.validate() {
    Some(error) => return @core.invalid_result(error)
    None => ()
  }
  if map.start.same(map.goal) {
    return @core.found_result([map.start], 0.0, 1, 0)
  }
  let initial_priority = @heuristics.estimate(heuristic, map.start, map.goal)
  let frontier = [{
    point: map.start,
    score: 0.0,
    priority: initial_priority,
  }]
  let scores = []
  let closed = []
  let parents = []
  let mut expanded = 0
  set_score(scores, map.start, 0.0, initial_priority)
  while !frontier.is_empty() {
    match pop_best(frontier) {
      Some(entry) => {
        let current = entry.point
        if !contains_point(closed, current) {
          closed.push(current)
          expanded = expanded + 1
          if current.same(map.goal) {
            return @core.found_result(
              point_path(parents, map.start, map.goal),
              path_cost(parents, map.start, map.goal),
              scores.length(),
              expanded,
            )
          }
          for neighbor in map.neighbors(current, movement) {
            let candidate = entry.score + neighbor.cost
            let priority = candidate +
              @heuristics.estimate(heuristic, neighbor.point, map.goal)
            match score_for(scores, neighbor.point) {
              Some(old_score) => {
                if candidate < old_score {
                  set_score(scores, neighbor.point, candidate, priority)
                  set_parent(parents, neighbor.point, current, neighbor.cost)
                  frontier.push({
                    point: neighbor.point,
                    score: candidate,
                    priority,
                  })
                }
              }
              None => {
                set_score(scores, neighbor.point, candidate, priority)
                set_parent(parents, neighbor.point, current, neighbor.cost)
                frontier.push({
                  point: neighbor.point,
                  score: candidate,
                  priority,
                })
              }
            }
          }
        }
      }
      None => ()
    }
  }
  @core.no_path_result(scores.length(), expanded)
}

