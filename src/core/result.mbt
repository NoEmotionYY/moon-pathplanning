///|
pub(all) enum SearchStatus {
  Found
  NoPath
  InvalidInput
} derive(Debug)

///|
pub(all) struct PathResult {
  path : Array[Point]
  total_cost : Double
  visited_nodes : Int
  expanded_nodes : Int
  status : SearchStatus
  error : SearchError?
} derive(Debug)

///|
pub fn found_result(
  path : Array[Point],
  total_cost : Double,
  visited_nodes : Int,
  expanded_nodes : Int,
) -> PathResult {
  {
    path,
    total_cost,
    visited_nodes,
    expanded_nodes,
    status: Found,
    error: None,
  }
}

///|
pub fn no_path_result(visited_nodes : Int, expanded_nodes : Int) -> PathResult {
  {
    path: [],
    total_cost: 0.0,
    visited_nodes,
    expanded_nodes,
    status: NoPath,
    error: None,
  }
}

///|
pub fn invalid_result(error : SearchError) -> PathResult {
  {
    path: [],
    total_cost: 0.0,
    visited_nodes: 0,
    expanded_nodes: 0,
    status: InvalidInput,
    error: Some(error),
  }
}

