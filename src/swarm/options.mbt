///|
pub(all) struct RandomState {
  seed : Int
} derive(Debug)

///|
pub(all) struct PsoOptions {
  population_size : Int
  max_iterations : Int
  seed : Int
  stagnation_limit : Int
  movement : @grid.MovementMode
  fitness_weights : FitnessWeights
} derive(Debug)

///|
pub fn random_state(seed : Int) -> RandomState {
  { seed, }
}

///|
fn normalized_seed(seed : Int) -> Int {
  let raw = seed % 1000003
  if raw < 0 {
    raw + 1000003
  } else {
    raw
  }
}

///|
pub fn RandomState::next_double(self : RandomState) -> (RandomState, Double) {
  let next_seed = (normalized_seed(self.seed) * 73 + 41) % 1000003
  ({ seed: next_seed }, next_seed.to_double() / 1000003.0)
}

///|
pub fn RandomState::next_int(
  self : RandomState,
  bound : Int,
) -> (RandomState, Int) {
  let next_seed = (normalized_seed(self.seed) * 73 + 41) % 1000003
  let value = if bound <= 0 { 0 } else { next_seed % bound }
  ({ seed: next_seed }, value)
}

///|
pub fn default_options() -> PsoOptions {
  {
    population_size: 60,
    max_iterations: 100,
    seed: 42,
    stagnation_limit: 3,
    movement: @grid.FourWay,
    fitness_weights: default_fitness_weights(),
  }
}

///|
pub fn options(
  population_size : Int,
  max_iterations : Int,
  seed : Int,
  stagnation_limit : Int,
  movement : @grid.MovementMode,
  fitness_weights : FitnessWeights,
) -> PsoOptions {
  {
    population_size,
    max_iterations,
    seed,
    stagnation_limit,
    movement,
    fitness_weights,
  }
}
