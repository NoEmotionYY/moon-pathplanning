///|
pub(all) enum AlgorithmType {
  Bfs
  Dfs
  Dijkstra
  AStar
  BidirectionalAStar
  LpaStar
  DStarLite
  Pso
  RsApso
  Rrt
  RrtConnect
  RrtStar
} derive(Debug)

///|
pub(all) struct PlannerOptions {
  movement : @grid.MovementMode
  heuristic : @heuristics.HeuristicKind
} derive(Debug)

///|
pub fn default_options() -> PlannerOptions {
  { movement: @grid.FourWay, heuristic: @heuristics.Manhattan }
}

///|
pub fn eight_way_options() -> PlannerOptions {
  { movement: @grid.EightWay, heuristic: @heuristics.Octile }
}

///|
pub fn options(
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> PlannerOptions {
  { movement, heuristic }
}

///|
fn swarm_options(options : PlannerOptions) -> @swarm.PsoOptions {
  @swarm.options(
    60,
    100,
    42,
    3,
    options.movement,
    @swarm.default_fitness_weights(),
  )
}

///|
fn plan_pso(map : @grid.GridMap, options : PlannerOptions) -> @core.PathResult {
  let region = @region.build_search_region(map, @region.default_options())
  @swarm.pso_plan(map, region, swarm_options(options)).result
}

///|
fn plan_rs_apso(
  map : @grid.GridMap,
  options : PlannerOptions,
) -> @core.PathResult {
  let region = @region.build_search_region(map, @region.default_options())
  @swarm.rs_apso_plan(map, region, swarm_options(options)).result
}

///|
fn plan_rrt(map : @grid.GridMap) -> @core.PathResult {
  @continuous.rrt_plan(map, @continuous.default_rrt_options()).result
}

///|
fn plan_rrt_connect(map : @grid.GridMap) -> @core.PathResult {
  @continuous.rrt_connect_plan(map, @continuous.default_rrt_options()).result
}

///|
fn plan_rrt_star(map : @grid.GridMap) -> @core.PathResult {
  @continuous.rrt_star_plan(map, @continuous.default_rrt_star_options()).result
}

///|
pub fn plan(
  map : @grid.GridMap,
  algorithm : AlgorithmType,
  options : PlannerOptions,
) -> @core.PathResult {
  match algorithm {
    Bfs => @algorithms.bfs(map, options.movement)
    Dfs => @algorithms.dfs(map, options.movement)
    Dijkstra => @algorithms.dijkstra(map, options.movement)
    AStar => @algorithms.astar(map, options.movement, options.heuristic)
    BidirectionalAStar =>
      @algorithms.bidirectional_astar(map, options.movement, options.heuristic)
    LpaStar =>
      @algorithms.lpa_star_plan(map, options.movement, options.heuristic).result
    DStarLite =>
      @algorithms.d_star_lite_plan(map, options.movement, options.heuristic).result
    Pso => plan_pso(map, options)
    RsApso => plan_rs_apso(map, options)
    Rrt => plan_rrt(map)
    RrtConnect => plan_rrt_connect(map)
    RrtStar => plan_rrt_star(map)
  }
}
