///|
pub(all) struct RrtOptions {
  max_iterations : Int
  seed : Int
  goal_sample_rate : Double
} derive(Debug)

///|
pub(all) struct RrtPathResult {
  result : @core.PathResult
  iterations : Int
  nodes : Int
} derive(Debug)

///|
priv struct RrtRandomState {
  seed : Int
}

///|
priv struct RrtNode {
  point : @core.Point
  parent : Int
}

///|
fn rrt_path_result(
  result : @core.PathResult,
  iterations : Int,
  nodes : Int,
) -> RrtPathResult {
  { result, iterations, nodes }
}

///|
fn positive(value : Int, fallback : Int) -> Int {
  if value > 0 {
    value
  } else {
    fallback
  }
}

///|
fn clamp01(value : Double) -> Double {
  if value < 0.0 {
    0.0
  } else if value > 1.0 {
    1.0
  } else {
    value
  }
}

///|
fn normalized_seed(seed : Int) -> Int {
  let raw = seed % 1000003
  if raw < 0 {
    raw + 1000003
  } else {
    raw
  }
}

///|
fn random_state(seed : Int) -> RrtRandomState {
  { seed, }
}

///|
fn RrtRandomState::next_seed(self : RrtRandomState) -> Int {
  (normalized_seed(self.seed) * 73 + 41) % 1000003
}

///|
fn RrtRandomState::next_double(
  self : RrtRandomState,
) -> (RrtRandomState, Double) {
  let seed = self.next_seed()
  ({ seed, }, seed.to_double() / 1000003.0)
}

///|
fn RrtRandomState::next_int(
  self : RrtRandomState,
  bound : Int,
) -> (RrtRandomState, Int) {
  let seed = self.next_seed()
  let value = if bound <= 0 { 0 } else { seed % bound }
  ({ seed, }, value)
}

///|
fn index_to_point(map : @grid.GridMap, index : Int) -> @core.Point {
  @core.point(index % map.width, index / map.width)
}

///|
fn walkable_from_index(map : @grid.GridMap, index : Int) -> @core.Point? {
  let total = map.width * map.height
  if total <= 0 {
    return None
  }
  for offset in 0..<total {
    let candidate_index = (index + offset) % total
    let candidate = index_to_point(map, candidate_index)
    if map.is_walkable(candidate) {
      return Some(candidate)
    }
  }
  None
}

///|
fn sample_point(
  map : @grid.GridMap,
  state : RrtRandomState,
  options : RrtOptions,
) -> (RrtRandomState, @core.Point?) {
  let (rate_state, choice) = state.next_double()
  if choice < clamp01(options.goal_sample_rate) {
    return (rate_state, Some(map.goal))
  }
  let (index_state, index) = rate_state.next_int(map.width * map.height)
  (index_state, walkable_from_index(map, index))
}

///|
fn distance_score(left : @core.Point, right : @core.Point) -> Int {
  let dx = left.x - right.x
  let dy = left.y - right.y
  dx * dx + dy * dy
}

///|
fn nearest_node_index(nodes : Array[RrtNode], point : @core.Point) -> Int? {
  if nodes.is_empty() {
    return None
  }
  let mut best_index = 0
  let mut best_score = distance_score(nodes[0].point, point)
  for index, node in nodes {
    let score = distance_score(node.point, point)
    if score < best_score {
      best_index = index
      best_score = score
    }
  }
  Some(best_index)
}

///|
fn contains_node(nodes : Array[RrtNode], point : @core.Point) -> Bool {
  for node in nodes {
    if node.point.same(point) {
      return true
    }
  }
  false
}

///|
fn node_path(nodes : Array[RrtNode], goal_index : Int) -> Array[@core.Point] {
  let reversed = []
  let mut index = goal_index
  while index >= 0 {
    reversed.push(nodes[index].point)
    index = nodes[index].parent
  }
  let path = []
  let mut cursor = reversed.length()
  while cursor > 0 {
    cursor = cursor - 1
    path.push(reversed[cursor])
  }
  path
}

///|
fn path_cost(path : Array[@core.Point]) -> Double {
  if path.length() < 2 {
    return 0.0
  }
  let mut total = 0.0
  for index in 1..<path.length() {
    total = total + @heuristics.euclidean(path[index - 1], path[index])
  }
  total
}

///|
fn build_found_result(
  map : @grid.GridMap,
  nodes : Array[RrtNode],
  goal_index : Int,
  iterations : Int,
) -> RrtPathResult {
  let path = shortcut_path(map, node_path(nodes, goal_index))
  rrt_path_result(
    @core.found_result(path, path_cost(path), nodes.length(), iterations),
    iterations,
    nodes.length(),
  )
}

///|
pub fn default_rrt_options() -> RrtOptions {
  { max_iterations: 200, seed: 42, goal_sample_rate: 0.15 }
}

///|
pub fn rrt_options(
  max_iterations : Int,
  seed : Int,
  goal_sample_rate : Double,
) -> RrtOptions {
  { max_iterations, seed, goal_sample_rate }
}

///|
pub fn rrt_plan(map : @grid.GridMap, options : RrtOptions) -> RrtPathResult {
  match map.validate() {
    Some(error) => return rrt_path_result(@core.invalid_result(error), 0, 0)
    None => ()
  }
  if map.start.same(map.goal) {
    return rrt_path_result(@core.found_result([map.start], 0.0, 1, 0), 0, 1)
  }
  let nodes = [{ point: map.start, parent: -1 }]
  if segment_is_walkable(map, map.start, map.goal) {
    nodes.push({ point: map.goal, parent: 0 })
    return build_found_result(map, nodes, 1, 0)
  }
  let mut state = random_state(options.seed)
  let max_iterations = positive(options.max_iterations, 1)
  for iteration in 0..<max_iterations {
    let (next_state, sample) = sample_point(map, state, options)
    state = next_state
    match sample {
      Some(point) =>
        match nearest_node_index(nodes, point) {
          Some(nearest_index) => {
            let nearest = nodes[nearest_index].point
            if !contains_node(nodes, point) &&
              segment_is_walkable(map, nearest, point) {
              let added_index = nodes.length()
              nodes.push({ point, parent: nearest_index })
              if point.same(map.goal) {
                return build_found_result(
                  map,
                  nodes,
                  added_index,
                  iteration + 1,
                )
              }
              if segment_is_walkable(map, point, map.goal) {
                let goal_index = nodes.length()
                nodes.push({ point: map.goal, parent: added_index })
                return build_found_result(map, nodes, goal_index, iteration + 1)
              }
            }
          }
          None => ()
        }
      None => ()
    }
  }
  rrt_path_result(
    @core.no_path_result(nodes.length(), max_iterations),
    max_iterations,
    nodes.length(),
  )
}
