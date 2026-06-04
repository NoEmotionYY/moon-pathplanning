///|
pub(all) struct TerrainCell {
  point : @core.Point
  cost : Double
} derive(Debug)

///|
pub fn terrain_cell(point : @core.Point, cost : Double) -> TerrainCell {
  { point, cost }
}
