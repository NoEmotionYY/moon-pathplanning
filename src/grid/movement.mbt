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
fn push_diagonal_neighbor(
  map : GridMap,
  neighbors : Array[Neighbor],
  from : @core.Point,
  dx : Int,
  dy : Int,
  base_cost : Double,
) -> Unit {
  let horizontal = @core.point(from.x + dx, from.y)
  let vertical = @core.point(from.x, from.y + dy)
  let diagonal = @core.point(from.x + dx, from.y + dy)
  if map.is_walkable(horizontal) &&
    map.is_walkable(vertical) &&
    map.is_walkable(diagonal) {
    neighbors.push({
      point: diagonal,
      cost: base_cost * map.terrain_cost(diagonal),
    })
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
      push_diagonal_neighbor(self, neighbors, point, 1, 1, diagonal)
      push_diagonal_neighbor(self, neighbors, point, -1, 1, diagonal)
      push_diagonal_neighbor(self, neighbors, point, 1, -1, diagonal)
      push_diagonal_neighbor(self, neighbors, point, -1, -1, diagonal)
    }
  }
  neighbors
}
