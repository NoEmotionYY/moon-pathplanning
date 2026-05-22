///|
test "heuristics estimate grid distances" {
  let start = @core.point(0, 0)
  let goal = @core.point(3, 4)
  assert_eq(@heuristics.manhattan(start, goal), 7.0)
  assert_eq(@heuristics.chebyshev(start, goal), 4.0)
  assert_eq(@heuristics.euclidean(start, goal), 5.0)
  assert_eq(@heuristics.octile(start, goal) > 5.0, true)
}

