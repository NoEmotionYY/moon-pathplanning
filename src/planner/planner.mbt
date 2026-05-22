///|
pub(all) enum AlgorithmType {
  Bfs
  Dfs
  Dijkstra
  AStar
  BidirectionalAStar
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
  }
}

