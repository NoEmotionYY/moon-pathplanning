///|
pub(all) enum MovementMode {
  FourWay
  EightWay
} derive(Debug)

///|
pub(all) struct Neighbor {
  point : @core.Point
  cost : Double
} derive(Debug)

///|
fn push_neighbor(
  map : GridMap,
  neighbors : Array[Neighbor],
  point : @core.Point,
  base_cost : Double,
) -> Unit {
  if map.is_walkable(point) {
    neighbors.push({ point, cost: base_cost * map.terrain_cost(point) })
  }
}

///|
pub fn GridMap::neighbors(
  self : GridMap,
  point : @core.Point,
  movement : MovementMode,
) -> Array[Neighbor] {
  let neighbors = []
  push_neighbor(self, neighbors, @core.point(point.x + 1, point.y), 1.0)
  push_neighbor(self, neighbors, @core.point(point.x - 1, point.y), 1.0)
  push_neighbor(self, neighbors, @core.point(point.x, point.y + 1), 1.0)
  push_neighbor(self, neighbors, @core.point(point.x, point.y - 1), 1.0)
  match movement {
    FourWay => ()
    EightWay => {
      let diagonal = 1.4142135623730951
      push_neighbor(
        self,
        neighbors,
        @core.point(point.x + 1, point.y + 1),
        diagonal,
      )
      push_neighbor(
        self,
        neighbors,
        @core.point(point.x - 1, point.y + 1),
        diagonal,
      )
      push_neighbor(
        self,
        neighbors,
        @core.point(point.x + 1, point.y - 1),
        diagonal,
      )
      push_neighbor(
        self,
        neighbors,
        @core.point(point.x - 1, point.y - 1),
        diagonal,
      )
    }
  }
  neighbors
}
