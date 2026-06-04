///|
pub(all) struct FitnessWeights {
  length_weight : Double
  smoothness_weight : Double
} derive(Debug)

///|
pub fn default_fitness_weights() -> FitnessWeights {
  { length_weight: 0.58, smoothness_weight: 0.42 }
}

///|
pub fn fitness_weights(
  length_weight : Double,
  smoothness_weight : Double,
) -> FitnessWeights {
  { length_weight, smoothness_weight }
}

///|
fn sign(value : Int) -> Int {
  if value > 0 {
    1
  } else if value < 0 {
    -1
  } else {
    0
  }
}

///|
pub fn path_length(path : Array[@core.Point]) -> Double {
  if path.length() < 2 {
    return 0.0
  }
  let mut total = 0.0
  for index in 1..<path.length() {
    total = total + @heuristics.euclidean(path[index - 1], path[index])
  }
  total
}

///|
pub fn path_smoothness(path : Array[@core.Point]) -> Double {
  if path.length() < 3 {
    return 0.0
  }
  let mut turns = 0.0
  for index in 2..<path.length() {
    let previous = path[index - 2]
    let current = path[index - 1]
    let next = path[index]
    let dx1 = sign(current.x - previous.x)
    let dy1 = sign(current.y - previous.y)
    let dx2 = sign(next.x - current.x)
    let dy2 = sign(next.y - current.y)
    if dx1 != dx2 || dy1 != dy2 {
      turns = turns + 1.0
    }
  }
  turns
}

///|
pub fn path_fitness(
  path : Array[@core.Point],
  weights : FitnessWeights,
) -> Double {
  weights.length_weight * path_length(path) +
  weights.smoothness_weight * path_smoothness(path)
}
