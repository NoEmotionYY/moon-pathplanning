///|
pub(all) struct MovingObstacle {
  position : @core.Point
  speed : Double
  velocity_x : Int
  velocity_y : Int
} derive(Debug)

///|
pub(all) struct ContinuousMovingObstacle {
  x : Double
  y : Double
  speed : Double
  velocity_x : Double
  velocity_y : Double
} derive(Debug)

///|
pub(all) struct ContinuousPoint {
  x : Double
  y : Double
} derive(Debug)

///|
pub(all) struct ContinuousSegment {
  start : ContinuousPoint
  goal : ContinuousPoint
  start_time : Double
  end_time : Double
} derive(Debug)

///|
pub(all) struct ContinuousCollision {
  segment_index : Int
  sample_index : Int
  obstacle_index : Int
  time : Double
  robot : ContinuousPoint
  obstacle : ContinuousPoint
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
pub fn continuous_moving_obstacle(
  x : Double,
  y : Double,
  speed : Double,
  velocity_x : Double,
  velocity_y : Double,
) -> ContinuousMovingObstacle {
  { x, y, speed, velocity_x, velocity_y }
}

///|
pub fn continuous_point(x : Double, y : Double) -> ContinuousPoint {
  { x, y }
}

///|
pub fn continuous_point_from_grid(point : @core.Point) -> ContinuousPoint {
  { x: point.x.to_double(), y: point.y.to_double() }
}

///|
pub fn continuous_segment(
  start : ContinuousPoint,
  goal : ContinuousPoint,
  start_time : Double,
  end_time : Double,
) -> ContinuousSegment {
  { start, goal, start_time, end_time }
}

///|
pub fn ContinuousPoint::distance_squared(
  self : ContinuousPoint,
  other : ContinuousPoint,
) -> Double {
  let dx = self.x - other.x
  let dy = self.y - other.y
  dx * dx + dy * dy
}

///|
pub fn ContinuousPoint::interpolate(
  self : ContinuousPoint,
  goal : ContinuousPoint,
  ratio : Double,
) -> ContinuousPoint {
  {
    x: self.x + (goal.x - self.x) * ratio,
    y: self.y + (goal.y - self.y) * ratio,
  }
}

///|
pub fn ContinuousSegment::point_at_time(
  self : ContinuousSegment,
  time : Double,
) -> ContinuousPoint {
  let duration = self.end_time - self.start_time
  if duration <= 0.0 || time >= self.end_time {
    self.goal
  } else if time <= self.start_time {
    self.start
  } else {
    self.start.interpolate(self.goal, (time - self.start_time) / duration)
  }
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
pub fn ContinuousMovingObstacle::at_time(
  self : ContinuousMovingObstacle,
  time : Double,
) -> ContinuousMovingObstacle {
  {
    x: self.x + self.velocity_x * time,
    y: self.y + self.velocity_y * time,
    speed: self.speed,
    velocity_x: self.velocity_x,
    velocity_y: self.velocity_y,
  }
}

///|
pub fn ContinuousMovingObstacle::at_step_time(
  self : ContinuousMovingObstacle,
  step : Int,
  step_time : Double,
) -> ContinuousMovingObstacle {
  self.at_time(step.to_double() * step_time)
}

///|
fn positive_mod(value : Int, divisor : Int) -> Int {
  let remainder = value % divisor
  if remainder < 0 {
    remainder + divisor
  } else {
    remainder
  }
}

///|
pub fn reflected_coordinate(
  origin : Int,
  velocity : Int,
  step : Int,
  min : Int,
  max : Int,
) -> Int {
  if min >= max {
    min
  } else {
    let span = max - min
    let period = span * 2
    let offset = positive_mod(origin + velocity * step - min, period)
    if offset <= span {
      min + offset
    } else {
      max - (offset - span)
    }
  }
}

///|
pub fn MovingObstacle::at_reflected_step(
  self : MovingObstacle,
  step : Int,
  min_x : Int,
  max_x : Int,
  min_y : Int,
  max_y : Int,
) -> MovingObstacle {
  {
    position: @core.point(
      reflected_coordinate(self.position.x, self.velocity_x, step, min_x, max_x),
      reflected_coordinate(self.position.y, self.velocity_y, step, min_y, max_y),
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
  collision_radius_by_speed(options, obstacle.speed)
}

///|
pub fn continuous_collision_radius(
  options : CollisionOptions,
  obstacle : ContinuousMovingObstacle,
) -> Double {
  collision_radius_by_speed(options, obstacle.speed)
}

///|
fn collision_radius_by_speed(
  options : CollisionOptions,
  obstacle_speed : Double,
) -> Double {
  if options.robot_speed <= 0.0 || obstacle_speed <= 0.0 {
    options.unit_grid_length
  } else {
    let danger = options.proportion * options.robot_speed / obstacle_speed
    let safety = obstacle_speed / options.robot_speed
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
pub fn would_collide_continuous(
  robot_point : @core.Point,
  obstacle : ContinuousMovingObstacle,
  options : CollisionOptions,
) -> Bool {
  let dx = robot_point.x.to_double() - obstacle.x
  let dy = robot_point.y.to_double() - obstacle.y
  let radius = continuous_collision_radius(options, obstacle)
  dx * dx + dy * dy <= radius * radius
}

///|
pub fn would_collide_continuous_point(
  robot_point : ContinuousPoint,
  obstacle : ContinuousMovingObstacle,
  options : CollisionOptions,
) -> Bool {
  let obstacle_point = continuous_point(obstacle.x, obstacle.y)
  let radius = continuous_collision_radius(options, obstacle)
  robot_point.distance_squared(obstacle_point) <= radius * radius
}

///|
pub fn continuous_segment_collides(
  segment : ContinuousSegment,
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  samples : Int,
) -> Bool {
  continuous_segment_first_collision(segment, obstacles, options, samples)
  is Some(_)
}

///|
fn continuous_segment_first_collision_with_index(
  segment : ContinuousSegment,
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  samples : Int,
  segment_index : Int,
) -> ContinuousCollision? {
  if obstacles.is_empty() {
    return None
  }
  let safe_samples = if samples < 1 { 1 } else { samples }
  let duration = segment.end_time - segment.start_time
  for sample_index in 0..<(safe_samples + 1) {
    let ratio = sample_index.to_double() / safe_samples.to_double()
    let time = segment.start_time + duration * ratio
    let robot = segment.point_at_time(time)
    for obstacle_index, obstacle in obstacles {
      let projected = obstacle.at_time(time)
      if would_collide_continuous_point(robot, projected, options) {
        return Some({
          segment_index,
          sample_index,
          obstacle_index,
          time,
          robot,
          obstacle: continuous_point(projected.x, projected.y),
        })
      }
    }
  }
  None
}

///|
pub fn continuous_segment_first_collision(
  segment : ContinuousSegment,
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  samples : Int,
) -> ContinuousCollision? {
  continuous_segment_first_collision_with_index(
    segment, obstacles, options, samples, 0,
  )
}

///|
pub fn continuous_segments_from_grid_path(
  path : Array[@core.Point],
  step_time : Double,
) -> Array[ContinuousSegment] {
  let segments = []
  if path.length() < 2 {
    return segments
  }
  let safe_step_time = if step_time <= 0.0 { 1.0 } else { step_time }
  for index in 1..<path.length() {
    segments.push(
      continuous_segment(
        continuous_point_from_grid(path[index - 1]),
        continuous_point_from_grid(path[index]),
        (index - 1).to_double() * safe_step_time,
        index.to_double() * safe_step_time,
      ),
    )
  }
  segments
}

///|
pub fn continuous_path_is_safe(
  segments : Array[ContinuousSegment],
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  samples_per_segment : Int,
) -> Bool {
  continuous_path_first_collision(
    segments, obstacles, options, samples_per_segment,
  )
  is None
}

///|
pub fn continuous_path_first_collision(
  segments : Array[ContinuousSegment],
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  samples_per_segment : Int,
) -> ContinuousCollision? {
  for segment_index, segment in segments {
    match
      continuous_segment_first_collision_with_index(
        segment, obstacles, options, samples_per_segment, segment_index,
      ) {
      Some(collision) => return Some(collision)
      None => ()
    }
  }
  None
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
fn any_continuous_collision(
  point : @core.Point,
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
) -> Bool {
  for obstacle in obstacles {
    if would_collide_continuous(point, obstacle, options) {
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
fn projected_continuous_obstacles(
  obstacles : Array[ContinuousMovingObstacle],
  step : Int,
  step_time : Double,
) -> Array[ContinuousMovingObstacle] {
  let projected = []
  for obstacle in obstacles {
    projected.push(obstacle.at_step_time(step, step_time))
  }
  projected
}

///|
fn reflected_obstacles(
  obstacles : Array[MovingObstacle],
  step : Int,
  min_x : Int,
  max_x : Int,
  min_y : Int,
  max_y : Int,
) -> Array[MovingObstacle] {
  let projected = []
  for obstacle in obstacles {
    projected.push(obstacle.at_reflected_step(step, min_x, max_x, min_y, max_y))
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
fn choose_continuous_jump_point(
  map : @grid.GridMap,
  current : @core.Point,
  obstacles : Array[ContinuousMovingObstacle],
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
      !any_continuous_collision(candidate, obstacles, options) {
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
pub fn jump_avoidance_over_continuous_time(
  map : @grid.GridMap,
  path : Array[@core.Point],
  obstacles : Array[ContinuousMovingObstacle],
  options : CollisionOptions,
  step_time : Double,
) -> Array[@core.Point] {
  if path.length() < 2 || obstacles.is_empty() {
    return path
  }
  let adjusted = []
  adjusted.push(path[0])
  let safe_step_time = if step_time <= 0.0 { 1.0 } else { step_time }
  for index in 1..<path.length() {
    let current = adjusted[adjusted.length() - 1]
    let next = path[index]
    let projected = projected_continuous_obstacles(
      obstacles, index, safe_step_time,
    )
    if any_continuous_collision(next, projected, options) {
      push_unique(
        adjusted,
        choose_continuous_jump_point(map, current, projected, options),
      )
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

///|
pub fn jump_avoidance_over_reflected_time(
  map : @grid.GridMap,
  path : Array[@core.Point],
  obstacles : Array[MovingObstacle],
  options : CollisionOptions,
  min_x : Int,
  max_x : Int,
  min_y : Int,
  max_y : Int,
) -> Array[@core.Point] {
  if path.length() < 2 || obstacles.is_empty() {
    return path
  }
  let adjusted = []
  adjusted.push(path[0])
  for index in 1..<path.length() {
    let current = adjusted[adjusted.length() - 1]
    let next = path[index]
    let projected = reflected_obstacles(
      obstacles, index, min_x, max_x, min_y, max_y,
    )
    if any_collision(next, projected, options) {
      push_unique(adjusted, choose_jump_point(map, current, projected, options))
    } else {
      push_unique(adjusted, next)
    }
  }
  adjusted
}
