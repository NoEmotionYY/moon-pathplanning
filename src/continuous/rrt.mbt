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
pub(all) struct RrtStarOptions {
  max_iterations : Int
  seed : Int
  goal_sample_rate : Double
  rewire_radius : Int
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
priv struct RrtStarNode {
  point : @core.Point
  parent : Int
  cost : Double
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
  target : @core.Point,
) -> (RrtRandomState, @core.Point?) {
  let (rate_state, choice) = state.next_double()
  if choice < clamp01(options.goal_sample_rate) {
    return (rate_state, Some(target))
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
fn node_index_for(nodes : Array[RrtNode], point : @core.Point) -> Int? {
  for index, node in nodes {
    if node.point.same(point) {
      return Some(index)
    }
  }
  None
}

///|
fn extend_tree(
  map : @grid.GridMap,
  nodes : Array[RrtNode],
  point : @core.Point,
) -> Int? {
  match node_index_for(nodes, point) {
    Some(index) => return Some(index)
    None => ()
  }
  match nearest_node_index(nodes, point) {
    Some(nearest_index) => {
      let nearest = nodes[nearest_index].point
      if segment_is_walkable(map, nearest, point) {
        let added_index = nodes.length()
        nodes.push({ point, parent: nearest_index })
        Some(added_index)
      } else {
        None
      }
    }
    None => None
  }
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
fn push_unique_point(path : Array[@core.Point], point : @core.Point) -> Unit {
  if path.is_empty() || !path[path.length() - 1].same(point) {
    path.push(point)
  }
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
fn star_node_path(
  nodes : Array[RrtStarNode],
  goal_index : Int,
) -> Array[@core.Point] {
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
fn star_node_index_for(nodes : Array[RrtStarNode], point : @core.Point) -> Int? {
  for index, node in nodes {
    if node.point.same(point) {
      return Some(index)
    }
  }
  None
}

///|
fn star_distance(left : @core.Point, right : @core.Point) -> Double {
  @heuristics.euclidean(left, right)
}

///|
fn near_star_nodes(
  nodes : Array[RrtStarNode],
  point : @core.Point,
  radius : Int,
) -> Array[Int] {
  let near = []
  let score_limit = positive(radius, 1) * positive(radius, 1)
  for index, node in nodes {
    if distance_score(node.point, point) <= score_limit {
      near.push(index)
    }
  }
  near
}

///|
fn best_star_parent(
  map : @grid.GridMap,
  nodes : Array[RrtStarNode],
  point : @core.Point,
  radius : Int,
) -> (Int, Double)? {
  let near = near_star_nodes(nodes, point, radius)
  let mut best_index = -1
  let mut best_cost = 0.0
  for index in near {
    let node = nodes[index]
    if segment_is_walkable(map, node.point, point) {
      let candidate_cost = node.cost + star_distance(node.point, point)
      if best_index < 0 || candidate_cost < best_cost {
        best_index = index
        best_cost = candidate_cost
      }
    }
  }
  if best_index >= 0 {
    return Some((best_index, best_cost))
  }
  match nearest_node_index_from_star(nodes, point) {
    Some(nearest_index) => {
      let nearest = nodes[nearest_index]
      if segment_is_walkable(map, nearest.point, point) {
        Some(
          (nearest_index, nearest.cost + star_distance(nearest.point, point)),
        )
      } else {
        None
      }
    }
    None => None
  }
}

///|
fn nearest_node_index_from_star(
  nodes : Array[RrtStarNode],
  point : @core.Point,
) -> Int? {
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
fn is_ancestor(nodes : Array[RrtStarNode], ancestor : Int, child : Int) -> Bool {
  let mut cursor = child
  while cursor >= 0 {
    if cursor == ancestor {
      return true
    }
    cursor = nodes[cursor].parent
  }
  false
}

///|
fn adjust_descendant_costs(
  nodes : Array[RrtStarNode],
  parent : Int,
  delta : Double,
) -> Unit {
  for index, node in nodes {
    if node.parent == parent {
      nodes[index] = {
        point: node.point,
        parent: node.parent,
        cost: node.cost + delta,
      }
      adjust_descendant_costs(nodes, index, delta)
    }
  }
}

///|
fn rewire_star_nodes(
  map : @grid.GridMap,
  nodes : Array[RrtStarNode],
  new_index : Int,
  radius : Int,
) -> Unit {
  let new_node = nodes[new_index]
  for index in near_star_nodes(nodes, new_node.point, radius) {
    if index != new_index &&
      nodes[index].parent >= 0 &&
      !is_ancestor(nodes, index, new_index) {
      let node = nodes[index]
      if segment_is_walkable(map, new_node.point, node.point) {
        let candidate_cost = new_node.cost +
          star_distance(new_node.point, node.point)
        if candidate_cost < node.cost {
          let delta = candidate_cost - node.cost
          nodes[index] = {
            point: node.point,
            parent: new_index,
            cost: candidate_cost,
          }
          adjust_descendant_costs(nodes, index, delta)
        }
      }
    }
  }
}

///|
fn build_star_result(
  map : @grid.GridMap,
  nodes : Array[RrtStarNode],
  goal_index : Int,
  iterations : Int,
) -> RrtPathResult {
  let path = shortcut_path(map, star_node_path(nodes, goal_index))
  rrt_path_result(
    @core.found_result(path, path_cost(path), nodes.length(), iterations),
    iterations,
    nodes.length(),
  )
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
fn build_connect_result(
  map : @grid.GridMap,
  start_tree : Array[RrtNode],
  start_index : Int,
  goal_tree : Array[RrtNode],
  goal_index : Int,
  iterations : Int,
) -> RrtPathResult {
  let path = []
  for point in node_path(start_tree, start_index) {
    push_unique_point(path, point)
  }
  let goal_path = node_path(goal_tree, goal_index)
  let mut index = goal_path.length()
  while index > 0 {
    index = index - 1
    push_unique_point(path, goal_path[index])
  }
  let shortened = shortcut_path(map, path)
  let nodes = start_tree.length() + goal_tree.length()
  rrt_path_result(
    @core.found_result(shortened, path_cost(shortened), nodes, iterations),
    iterations,
    nodes,
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
pub fn default_rrt_star_options() -> RrtStarOptions {
  { max_iterations: 300, seed: 42, goal_sample_rate: 0.15, rewire_radius: 3 }
}

///|
pub fn rrt_star_options(
  max_iterations : Int,
  seed : Int,
  goal_sample_rate : Double,
  rewire_radius : Int,
) -> RrtStarOptions {
  { max_iterations, seed, goal_sample_rate, rewire_radius }
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
    let (next_state, sample) = sample_point(map, state, options, map.goal)
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

///|
pub fn rrt_star_plan(
  map : @grid.GridMap,
  options : RrtStarOptions,
) -> RrtPathResult {
  match map.validate() {
    Some(error) => return rrt_path_result(@core.invalid_result(error), 0, 0)
    None => ()
  }
  if map.start.same(map.goal) {
    return rrt_path_result(@core.found_result([map.start], 0.0, 1, 0), 0, 1)
  }
  let nodes = [{ point: map.start, parent: -1, cost: 0.0 }]
  if segment_is_walkable(map, map.start, map.goal) {
    nodes.push({
      point: map.goal,
      parent: 0,
      cost: star_distance(map.start, map.goal),
    })
    return build_star_result(map, nodes, 1, 0)
  }
  let sample_options = rrt_options(
    options.max_iterations,
    options.seed,
    options.goal_sample_rate,
  )
  let mut state = random_state(options.seed)
  let max_iterations = positive(options.max_iterations, 1)
  let radius = positive(options.rewire_radius, 1)
  let mut goal_index = -1
  for _ in 0..<max_iterations {
    let (next_state, sample) = sample_point(
      map,
      state,
      sample_options,
      map.goal,
    )
    state = next_state
    match sample {
      Some(point) =>
        match star_node_index_for(nodes, point) {
          Some(_) => ()
          None =>
            match best_star_parent(map, nodes, point, radius) {
              Some((parent, cost)) => {
                let added_index = nodes.length()
                nodes.push({ point, parent, cost })
                rewire_star_nodes(map, nodes, added_index, radius)
                if point.same(map.goal) {
                  goal_index = added_index
                } else if segment_is_walkable(map, point, map.goal) {
                  let candidate_cost = nodes[added_index].cost +
                    star_distance(point, map.goal)
                  match star_node_index_for(nodes, map.goal) {
                    Some(existing_goal) =>
                      if candidate_cost < nodes[existing_goal].cost &&
                        !is_ancestor(nodes, existing_goal, added_index) {
                        let old_goal = nodes[existing_goal]
                        let delta = candidate_cost - old_goal.cost
                        nodes[existing_goal] = {
                          point: old_goal.point,
                          parent: added_index,
                          cost: candidate_cost,
                        }
                        adjust_descendant_costs(nodes, existing_goal, delta)
                        goal_index = existing_goal
                      }
                    None => {
                      goal_index = nodes.length()
                      nodes.push({
                        point: map.goal,
                        parent: added_index,
                        cost: candidate_cost,
                      })
                      rewire_star_nodes(map, nodes, goal_index, radius)
                    }
                  }
                }
              }
              None => ()
            }
        }
      None => ()
    }
  }
  if goal_index >= 0 {
    build_star_result(map, nodes, goal_index, max_iterations)
  } else {
    rrt_path_result(
      @core.no_path_result(nodes.length(), max_iterations),
      max_iterations,
      nodes.length(),
    )
  }
}

///|
pub fn rrt_connect_plan(
  map : @grid.GridMap,
  options : RrtOptions,
) -> RrtPathResult {
  match map.validate() {
    Some(error) => return rrt_path_result(@core.invalid_result(error), 0, 0)
    None => ()
  }
  if map.start.same(map.goal) {
    return rrt_path_result(@core.found_result([map.start], 0.0, 1, 0), 0, 1)
  }
  let start_tree = [{ point: map.start, parent: -1 }]
  let goal_tree = [{ point: map.goal, parent: -1 }]
  if segment_is_walkable(map, map.start, map.goal) {
    start_tree.push({ point: map.goal, parent: 0 })
    return build_connect_result(map, start_tree, 1, goal_tree, 0, 0)
  }
  let mut state = random_state(options.seed)
  let max_iterations = positive(options.max_iterations, 1)
  for iteration in 0..<max_iterations {
    let grow_from_start = iteration % 2 == 0
    let target = if grow_from_start { map.goal } else { map.start }
    let (next_state, sample) = sample_point(map, state, options, target)
    state = next_state
    match sample {
      Some(point) =>
        if grow_from_start {
          match extend_tree(map, start_tree, point) {
            Some(start_index) => {
              let connection = start_tree[start_index].point
              match extend_tree(map, goal_tree, connection) {
                Some(goal_index) =>
                  return build_connect_result(
                    map,
                    start_tree,
                    start_index,
                    goal_tree,
                    goal_index,
                    iteration + 1,
                  )
                None => ()
              }
            }
            None => ()
          }
        } else {
          match extend_tree(map, goal_tree, point) {
            Some(goal_index) => {
              let connection = goal_tree[goal_index].point
              match extend_tree(map, start_tree, connection) {
                Some(start_index) =>
                  return build_connect_result(
                    map,
                    start_tree,
                    start_index,
                    goal_tree,
                    goal_index,
                    iteration + 1,
                  )
                None => ()
              }
            }
            None => ()
          }
        }
      None => ()
    }
  }
  let nodes = start_tree.length() + goal_tree.length()
  rrt_path_result(
    @core.no_path_result(nodes, max_iterations),
    max_iterations,
    nodes,
  )
}
