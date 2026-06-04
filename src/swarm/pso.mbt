///|
pub(all) struct Particle {
  waypoint : @core.Point
  best_waypoint : @core.Point
  best_fitness : Double
  stagnant_steps : Int
} derive(Debug)

///|
pub(all) struct PsoPathResult {
  result : @core.PathResult
  iterations : Int
  best_fitness : Double
  candidates : Int
} derive(Debug)

///|
fn pso_path_result(
  result : @core.PathResult,
  iterations : Int,
  best_fitness : Double,
  candidates : Int,
) -> PsoPathResult {
  { result, iterations, best_fitness, candidates }
}

///|
fn map_between(
  map : @grid.GridMap,
  start : @core.Point,
  goal : @core.Point,
) -> @grid.GridMap {
  {
    width: map.width,
    height: map.height,
    start,
    goal,
    obstacles: map.obstacles,
    terrain: map.terrain,
  }
}

///|
fn append_segment(
  path : Array[@core.Point],
  segment : Array[@core.Point],
) -> Unit {
  for index, point in segment {
    if path.is_empty() || index > 0 {
      path.push(point)
    }
  }
}

///|
pub fn candidate_path(
  map : @grid.GridMap,
  waypoint : @core.Point,
  movement : @grid.MovementMode,
) -> @core.PathResult {
  if !map.is_walkable(waypoint) {
    return @core.no_path_result(0, 0)
  }
  if waypoint.same(map.start) || waypoint.same(map.goal) {
    return @algorithms.astar(map, movement, @heuristics.Manhattan)
  }
  let first = @algorithms.astar(
    map_between(map, map.start, waypoint),
    movement,
    @heuristics.Manhattan,
  )
  let second = @algorithms.astar(
    map_between(map, waypoint, map.goal),
    movement,
    @heuristics.Manhattan,
  )
  if first.status is @core.Found && second.status is @core.Found {
    let path = []
    append_segment(path, first.path)
    append_segment(path, second.path)
    @core.found_result(
      path,
      first.total_cost + second.total_cost,
      first.visited_nodes + second.visited_nodes,
      first.expanded_nodes + second.expanded_nodes,
    )
  } else {
    @core.no_path_result(
      first.visited_nodes + second.visited_nodes,
      first.expanded_nodes + second.expanded_nodes,
    )
  }
}

///|
fn candidate_fitness(
  map : @grid.GridMap,
  waypoint : @core.Point,
  options : PsoOptions,
) -> Double {
  let result = candidate_path(map, waypoint, options.movement)
  if result.status is @core.Found {
    path_fitness(result.path, options.fitness_weights)
  } else {
    1000000000.0
  }
}

///|
fn particle_for(
  map : @grid.GridMap,
  waypoint : @core.Point,
  options : PsoOptions,
) -> Particle {
  let fitness = candidate_fitness(map, waypoint, options)
  {
    waypoint,
    best_waypoint: waypoint,
    best_fitness: fitness,
    stagnant_steps: 0,
  }
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
fn better_particle(left : Particle, right : Particle) -> Particle {
  if left.best_fitness <= right.best_fitness {
    left
  } else {
    right
  }
}

///|
fn initial_particles(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  options : PsoOptions,
) -> (Array[Particle], RandomState) {
  let particles = []
  let mut state = random_state(options.seed)
  let population = positive(options.population_size, 1)
  for _ in 0..<population {
    let (next_state, index) = state.next_int(region.cells.length())
    state = next_state
    particles.push(particle_for(map, region.cells[index], options))
  }
  (particles, state)
}

///|
fn best_particle(particles : Array[Particle]) -> Particle? {
  if particles.is_empty() {
    return None
  }
  let mut best = particles[0]
  for particle in particles {
    best = better_particle(best, particle)
  }
  Some(best)
}

///|
fn random_waypoint(
  region : @region.SearchRegion,
  state : RandomState,
) -> (RandomState, @core.Point) {
  let (next_state, index) = state.next_int(region.cells.length())
  (next_state, region.cells[index])
}

///|
fn choose_waypoint(
  region : @region.SearchRegion,
  particle : Particle,
  global_best : Particle,
  parameters : AdaptiveParameters,
  state : RandomState,
) -> (RandomState, @core.Point) {
  let (choice_state, choice) = state.next_double()
  let total = parameters.inertia_weight +
    parameters.cognitive_factor +
    parameters.social_factor +
    1.0
  let inertia_limit = parameters.inertia_weight / total
  let cognitive_limit = inertia_limit + parameters.cognitive_factor / total
  let social_limit = cognitive_limit + parameters.social_factor / total
  if choice < inertia_limit {
    (choice_state, particle.waypoint)
  } else if choice < cognitive_limit {
    (choice_state, particle.best_waypoint)
  } else if choice < social_limit {
    (choice_state, global_best.best_waypoint)
  } else {
    random_waypoint(region, choice_state)
  }
}

///|
fn escape_waypoint(
  region : @region.SearchRegion,
  global_best : Particle,
  parameters : AdaptiveParameters,
  state : RandomState,
) -> (RandomState, @core.Point) {
  let (choice_state, choice) = state.next_double()
  let total = parameters.escape_factor + parameters.social_factor + 1.0
  let escape_limit = parameters.escape_factor / total
  let social_limit = escape_limit + parameters.social_factor / total
  if choice < escape_limit {
    random_waypoint(region, choice_state)
  } else if choice < social_limit {
    (choice_state, global_best.best_waypoint)
  } else {
    random_waypoint(region, choice_state)
  }
}

///|
fn next_particle(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  particle : Particle,
  global_best : Particle,
  options : PsoOptions,
  parameters : AdaptiveParameters,
  state : RandomState,
) -> (Particle, RandomState) {
  let (waypoint_state, waypoint) = choose_waypoint(
    region, particle, global_best, parameters, state,
  )
  let next_state = waypoint_state
  let fitness = candidate_fitness(map, waypoint, options)
  if fitness < particle.best_fitness {
    (
      {
        waypoint,
        best_waypoint: waypoint,
        best_fitness: fitness,
        stagnant_steps: 0,
      },
      next_state,
    )
  } else if particle.stagnant_steps + 1 >= positive(options.stagnation_limit, 3) {
    let (escape_state, escape_point) = escape_waypoint(
      region, global_best, parameters, next_state,
    )
    let escape_fitness = candidate_fitness(map, escape_point, options)
    let escaped = if escape_fitness < particle.best_fitness {
      {
        waypoint: escape_point,
        best_waypoint: escape_point,
        best_fitness: escape_fitness,
        stagnant_steps: 0,
      }
    } else {
      {
        waypoint: escape_point,
        best_waypoint: particle.best_waypoint,
        best_fitness: particle.best_fitness,
        stagnant_steps: 0,
      }
    }
    (escaped, escape_state)
  } else {
    (
      {
        waypoint,
        best_waypoint: particle.best_waypoint,
        best_fitness: particle.best_fitness,
        stagnant_steps: particle.stagnant_steps + 1,
      },
      next_state,
    )
  }
}

///|
fn run_swarm_plan(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  options : PsoOptions,
  adaptive : Bool,
) -> PsoPathResult {
  match map.validate() {
    Some(error) =>
      return pso_path_result(
        @core.invalid_result(error),
        0,
        1000000000.0,
        region.cell_count(),
      )
    None => ()
  }
  if region.cells.is_empty() {
    return pso_path_result(@core.no_path_result(0, 0), 0, 1000000000.0, 0)
  }
  let (particles, initial_state) = initial_particles(map, region, options)
  let mut state = initial_state
  let mut iterations = 1
  let max_iterations = positive(options.max_iterations, 1)
  while iterations < max_iterations {
    let parameters = if adaptive {
      adaptive_parameters(iterations, max_iterations)
    } else {
      fixed_parameters()
    }
    match best_particle(particles) {
      Some(global_best) =>
        for index, particle in particles {
          let (updated, next_state) = next_particle(
            map, region, particle, global_best, options, parameters, state,
          )
          particles[index] = updated
          state = next_state
        }
      None => ()
    }
    iterations = iterations + 1
  }
  match best_particle(particles) {
    Some(global_best) => {
      let result = candidate_path(
        map,
        global_best.best_waypoint,
        options.movement,
      )
      pso_path_result(
        result,
        iterations,
        global_best.best_fitness,
        region.cell_count(),
      )
    }
    None =>
      pso_path_result(
        @core.no_path_result(0, 0),
        0,
        1000000000.0,
        region.cell_count(),
      )
  }
}

///|
pub fn pso_plan(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  options : PsoOptions,
) -> PsoPathResult {
  run_swarm_plan(map, region, options, false)
}

///|
pub fn rs_apso_plan(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  options : PsoOptions,
) -> PsoPathResult {
  run_swarm_plan(map, region, options, true)
}
