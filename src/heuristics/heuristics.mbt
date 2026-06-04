///|
pub(all) enum HeuristicKind {
  Manhattan
  Euclidean
  Chebyshev
  Octile
} derive(Debug)

///|
fn abs_int(value : Int) -> Int {
  if value < 0 {
    -value
  } else {
    value
  }
}

///|
fn min_int(left : Int, right : Int) -> Int {
  if left < right {
    left
  } else {
    right
  }
}

///|
fn max_int(left : Int, right : Int) -> Int {
  if left > right {
    left
  } else {
    right
  }
}

///|
fn sqrt(value : Double) -> Double {
  if value <= 0.0 {
    return 0.0
  }
  let mut root = value
  for _ in 0..<12 {
    root = (root + value / root) / 2.0
  }
  root
}

///|
fn dx(left : @core.Point, right : @core.Point) -> Int {
  abs_int(left.x - right.x)
}

///|
fn dy(left : @core.Point, right : @core.Point) -> Int {
  abs_int(left.y - right.y)
}

///|
pub fn manhattan(left : @core.Point, right : @core.Point) -> Double {
  dx(left, right).to_double() + dy(left, right).to_double()
}

///|
pub fn euclidean(left : @core.Point, right : @core.Point) -> Double {
  let width = dx(left, right).to_double()
  let height = dy(left, right).to_double()
  sqrt(width * width + height * height)
}

///|
pub fn chebyshev(left : @core.Point, right : @core.Point) -> Double {
  max_int(dx(left, right), dy(left, right)).to_double()
}

///|
pub fn octile(left : @core.Point, right : @core.Point) -> Double {
  let short_axis = min_int(dx(left, right), dy(left, right)).to_double()
  let long_axis = max_int(dx(left, right), dy(left, right)).to_double()
  long_axis + (1.4142135623730951 - 1.0) * short_axis
}

///|
pub fn estimate(
  kind : HeuristicKind,
  left : @core.Point,
  right : @core.Point,
) -> Double {
  match kind {
    Manhattan => manhattan(left, right)
    Euclidean => euclidean(left, right)
    Chebyshev => chebyshev(left, right)
    Octile => octile(left, right)
  }
}
