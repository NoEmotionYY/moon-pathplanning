///|
pub(all) enum SearchError {
  InvalidDimensions
  StartOutOfBounds
  GoalOutOfBounds
  StartBlocked
  GoalBlocked
  InvalidTerrainCost
  UnsupportedJsonInput
} derive(Debug)

///|
pub fn SearchError::message(self : SearchError) -> String {
  match self {
    InvalidDimensions => "grid dimensions must be positive"
    StartOutOfBounds => "start point is outside the grid"
    GoalOutOfBounds => "goal point is outside the grid"
    StartBlocked => "start point is blocked"
    GoalBlocked => "goal point is blocked"
    InvalidTerrainCost => "terrain cost must be positive"
    UnsupportedJsonInput => "JSON parsing is not available in the v1 importer"
  }
}

