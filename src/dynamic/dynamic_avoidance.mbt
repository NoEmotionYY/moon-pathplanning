///|
pub(all) struct MovingObstacle {
  position : @core.Point
  speed : Double
  velocity_x : Int
  velocity_y : Int
} derive(Debug)

///|
pub(all) struct CollisionOptions {
  robot_speed : Double
  unit_grid_length : Double
  proportion : Double
} derive(Debug)

///|
pub fn moving_obstacle(
  position : @core.Point,
  speed : Double,
) -> MovingObstacle {
  { position, speed, velocity_x: 0, velocity_y: 0 }
}

///|
pub fn moving_obstacle_with_velocity(
  position : @core.Point,
  speed : Double,
  velocity_x : Int,
  velocity_y : Int,
) -> MovingObstacle {
  { position, speed, velocity_x, velocity_y }
}

///|
pub fn MovingObstacle::at_step(
  self : MovingObstacle,
  step : Int,
) -> MovingObstacle {
  {
    position: @core.point(
      self.position.x + self.velocity_x * step,
      self.position.y + self.velocity_y * step,
    ),
    speed: self.speed,
    velocity_x: self.velocity_x,
    velocity_y: self.velocity_y,
  }
}

///|
pub fn collision_options(
  robot_speed : Double,
  unit_grid_length : Double,
  proportion : Double,
) -> CollisionOptions {
  { robot_speed, unit_grid_length, proportion }
}

///|
pub fn default_collision_options() -> CollisionOptions {
  { robot_speed: 2.0, unit_grid_length: 1.2, proportion: 0.5 }
}

///|
pub fn collision_radius(
  options : CollisionOptions,
  obstacle : MovingObstacle,
) -> Double {
  if options.robot_speed <= 0.0 || obstacle.speed <= 0.0 {
    options.unit_grid_length
  } else {
    let danger = options.proportion * options.robot_speed / obstacle.speed
    let safety = obstacle.speed / options.robot_speed
    (danger + safety) * options.unit_grid_length
  }
}

///|
pub fn would_collide(
  robot_point : @core.Point,
  obstacle : MovingObstacle,
  options : CollisionOptions,
) -> Bool {
  @heuristics.euclidean(robot_point, obstacle.position) <=
  collision_radius(options, obstacle)
}

///|
fn any_collision(
  point : @core.Point,
  obstacles : Array[MovingObstacle],
  options : CollisionOptions,
) -> Bool {
  for obstacle in obstacles {
    if would_collide(point, obstacle, options) {
      return true
    }
  }
  false
}

///|
fn projected_obstacles(
  obstacles : Array[MovingObstacle],
  step : Int,
) -> Array[MovingObstacle] {
  let projected = []
  for obstacle in obstacles {
    projected.push(obstacle.at_step(step))
  }
  projected
}

///|
fn sign(value : Int) -> Int {
  if value > 0 {
    1
  } else if value < 0 {
    -1
  } else {
    0
  }
}

///|
fn push_unique(points : Array[@core.Point], point : @core.Point) -> Unit {
  if points.is_empty() || !points[points.length() - 1].same(point) {
    points.push(point)
  }
}

///|
fn candidate_score(point : @core.Point, goal : @core.Point) -> Double {
  @heuristics.euclidean(point, goal)
}

///|
fn better_jump_candidate(
  left : @core.Point,
  right : @core.Point,
  goal : @core.Point,
) -> @core.Point {
  if candidate_score(left, goal) <= candidate_score(right, goal) {
    left
  } else {
    right
  }
}

///|
fn choose_jump_point(
  map : @grid.GridMap,
  current : @core.Point,
  obstacles : Array[MovingObstacle],
  options : CollisionOptions,
) -> @core.Point {
  let goal = map.goal
  let dx = sign(goal.x - current.x)
  let dy = sign(goal.y - current.y)
  let candidates = []
  if dx != 0 {
    candidates.push(@core.point(current.x + dx * 2, current.y))
    candidates.push(@core.point(current.x + dx, current.y))
  }
  if dy != 0 {
    candidates.push(@core.point(current.x, current.y + dy * 2))
    candidates.push(@core.point(current.x, current.y + dy))
  }
  let mut chosen = current
  let mut found = false
  for candidate in candidates {
    if map.is_walkable(candidate) &&
      !any_collision(candidate, obstacles, options) {
      if found {
        chosen = better_jump_candidate(chosen, candidate, goal)
      } else {
        chosen = candidate
        found = true
      }
    }
  }
  chosen
}

///|
pub fn jump_avoidance(
  map : @grid.GridMap,
  path : Array[@core.Point],
  obstacles : Array[MovingObstacle],
  options : CollisionOptions,
) -> Array[@core.Point] {
  if path.length() < 2 || obstacles.is_empty() {
    return path
  }
  let adjusted = []
  adjusted.push(path[0])
  for index in 1..<path.length() {
    let current = adjusted[adjusted.length() - 1]
    let next = path[index]
    if any_collision(next, obstacles, options) {
      push_unique(adjusted, choose_jump_point(map, current, obstacles, options))
    } else {
      push_unique(adjusted, next)
    }
  }
  adjusted
}

///|
pub fn jump_avoidance_over_time(
  map : @grid.GridMap,
  path : Array[@core.Point],
  obstacles : Array[MovingObstacle],
  options : CollisionOptions,
) -> Array[@core.Point] {
  if path.length() < 2 || obstacles.is_empty() {
    return path
  }
  let adjusted = []
  adjusted.push(path[0])
  for index in 1..<path.length() {
    let current = adjusted[adjusted.length() - 1]
    let next = path[index]
    let projected = projected_obstacles(obstacles, index)
    if any_collision(next, projected, options) {
      push_unique(adjusted, choose_jump_point(map, current, projected, options))
    } else {
      push_unique(adjusted, next)
    }
  }
  adjusted
}
