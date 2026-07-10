///|
test "swarm fitness measures path length and turns" {
  let straight = [@core.point(0, 0), @core.point(1, 0), @core.point(2, 0)]
  let bent = [@core.point(0, 0), @core.point(1, 0), @core.point(1, 1)]
  assert_eq(@swarm.path_length(straight), 2.0)
  assert_eq(@swarm.path_smoothness(straight), 0.0)
  assert_eq(@swarm.path_length(bent), 2.0)
  assert_eq(@swarm.path_smoothness(bent), 1.0)
  let weights = @swarm.default_fitness_weights()
  assert_eq(
    @swarm.path_fitness(straight, weights) < @swarm.path_fitness(bent, weights),
    true,
  )
}

///|
test "swarm random state is deterministic for a fixed seed" {
  let state = @swarm.random_state(42)
  let (next, value) = state.next_double()
  let (same_next, same_value) = @swarm.random_state(42).next_double()
  assert_eq(next.seed, same_next.seed)
  assert_eq(value, same_value)
  assert_eq(value >= 0.0, true)
  assert_eq(value < 1.0, true)
}

///|
test "swarm default options follow paper simulation defaults" {
  let options = @swarm.default_options()
  assert_eq(options.population_size, 60)
  assert_eq(options.max_iterations, 100)
  assert_eq(options.stagnation_limit, 3)
  assert_eq(options.movement is @grid.FourWay, true)
  assert_eq(options.fitness_weights.length_weight, 0.58)
  assert_eq(options.fitness_weights.smoothness_weight, 0.42)
}

///|
test "swarm adaptive parameters shift from self to social learning" {
  let early = @swarm.adaptive_parameters(0, 100)
  let late = @swarm.adaptive_parameters(100, 100)
  assert_eq(early.cognitive_factor > early.social_factor, true)
  assert_eq(late.social_factor > late.cognitive_factor, true)
  assert_eq(late.escape_factor > early.escape_factor, true)
  assert_eq(early.progress, 0.0)
  assert_eq(late.progress, 1.0)
}

///|
test "swarm candidate path joins astar segments through waypoint" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1)).with_obstacle(
    @core.point(2, 1),
  )
  let result = @swarm.candidate_path(map, @core.point(2, 0), @grid.FourWay)
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.path[0].same(@core.point(0, 1)), true)
  assert_eq(result.path[result.path.length() - 1].same(@core.point(4, 1)), true)
}

///|
test "swarm candidate path supports eight way movement" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
  let result = @swarm.candidate_path(map, @core.point(1, 1), @grid.EightWay)
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.path.length(), 3)
  assert_eq(result.path[1].same(@core.point(1, 1)), true)
}

///|
test "swarm candidate path uses octile astar cost for eight way movement" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
  let candidate = @swarm.candidate_path(map, @core.point(1, 1), @grid.EightWay)
  let direct = @algorithms.astar(map, @grid.EightWay, @heuristics.Octile)
  assert_eq(candidate.status is @core.Found, true)
  assert_eq(direct.status is @core.Found, true)
  assert_eq(candidate.total_cost, direct.total_cost)
}

///|
test "swarm candidate path keeps four way manhattan behavior" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
  let candidate = @swarm.candidate_path(map, @core.point(1, 1), @grid.FourWay)
  let direct = @algorithms.astar(map, @grid.FourWay, @heuristics.Manhattan)
  assert_eq(candidate.status is @core.Found, true)
  assert_eq(candidate.total_cost, direct.total_cost)
}

///|
test "swarm pso and rs-apso plans are deterministic for fixed seed" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1)).with_obstacle(
    @core.point(2, 1),
  )
  let region = @region.build_search_region(map, @region.default_options())
  let options = @swarm.options(
    8,
    12,
    7,
    3,
    @grid.FourWay,
    @swarm.default_fitness_weights(),
  )
  let first = @swarm.pso_plan(map, region, options)
  let second = @swarm.pso_plan(map, region, options)
  let adaptive_first = @swarm.rs_apso_plan(map, region, options)
  let adaptive_second = @swarm.rs_apso_plan(map, region, options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.iterations, 12)
  assert_eq(first.candidates, region.cell_count())
  assert_eq(first.result.total_cost, second.result.total_cost)
  assert_eq(first.best_fitness, second.best_fitness)
  assert_eq(adaptive_first.result.status is @core.Found, true)
  assert_eq(adaptive_first.iterations, 12)
  assert_eq(adaptive_first.result.total_cost, adaptive_second.result.total_cost)
  assert_eq(adaptive_first.best_fitness, adaptive_second.best_fitness)
}

///|
test "swarm pso and rs-apso remain deterministic for eight way fixed seed" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4)).with_obstacle(
    @core.point(2, 2),
  )
  let region = @region.build_search_region(map, @region.default_options())
  let options = @swarm.options(
    8,
    12,
    7,
    3,
    @grid.EightWay,
    @swarm.default_fitness_weights(),
  )
  let first = @swarm.pso_plan(map, region, options)
  let second = @swarm.pso_plan(map, region, options)
  let adaptive_first = @swarm.rs_apso_plan(map, region, options)
  let adaptive_second = @swarm.rs_apso_plan(map, region, options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.result.total_cost, second.result.total_cost)
  assert_eq(first.best_fitness, second.best_fitness)
  assert_eq(adaptive_first.result.status is @core.Found, true)
  assert_eq(adaptive_first.result.total_cost, adaptive_second.result.total_cost)
  assert_eq(adaptive_first.best_fitness, adaptive_second.best_fitness)
}

///|
test "swarm rs-apso escape stays deterministic under immediate stagnation" {
  let map = @grid.new_grid(7, 5, @core.point(0, 2), @core.point(6, 2)).with_obstacles([
      @core.point(3, 0),
      @core.point(3, 1),
      @core.point(3, 3),
      @core.point(3, 4),
    ],
  )
  let region = @region.build_search_region(map, @region.default_options())
  let options = @swarm.options(
    10,
    16,
    11,
    1,
    @grid.FourWay,
    @swarm.default_fitness_weights(),
  )
  let first = @swarm.rs_apso_plan(map, region, options)
  let second = @swarm.rs_apso_plan(map, region, options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.iterations, 16)
  assert_eq(first.candidates, region.cell_count())
  assert_eq(first.result.total_cost, second.result.total_cost)
  assert_eq(first.best_fitness, second.best_fitness)
}
