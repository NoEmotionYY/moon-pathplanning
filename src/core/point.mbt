///|
pub(all) struct Point {
  x : Int
  y : Int
} derive(Debug)

///|
pub type Coord = Point

///|
pub fn point(x : Int, y : Int) -> Point {
  { x, y }
}

///|
pub fn Point::same(self : Point, other : Point) -> Bool {
  self.x == other.x && self.y == other.y
}

///|
pub fn Point::key(self : Point, width : Int) -> Int {
  self.y * width + self.x
}

///|
pub fn point_from_key(key : Int, width : Int) -> Point {
  { x: key % width, y: key / width }
}
