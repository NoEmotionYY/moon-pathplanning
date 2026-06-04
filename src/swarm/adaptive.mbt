///|
pub(all) struct AdaptiveParameters {
  iteration : Int
  progress : Double
  inertia_weight : Double
  cognitive_factor : Double
  social_factor : Double
  escape_factor : Double
} derive(Debug)

///|
fn pi() -> Double {
  3.141592653589793
}

///|
fn clamp01(value : Double) -> Double {
  if value < 0.0 {
    0.0
  } else if value > 1.0 {
    1.0
  } else {
    value
  }
}

///|
fn progress(iteration : Int, max_iterations : Int) -> Double {
  if max_iterations <= 0 {
    0.0
  } else {
    clamp01(iteration.to_double() / max_iterations.to_double())
  }
}

///|
fn normalize_angle(value : Double) -> Double {
  let two_pi = 2.0 * pi()
  let mut angle = value
  while angle > pi() {
    angle = angle - two_pi
  }
  while angle < -pi() {
    angle = angle + two_pi
  }
  angle
}

///|
fn sin_approx(value : Double) -> Double {
  let x = normalize_angle(value)
  let x2 = x * x
  let series = 1.0 -
    x2 / 6.0 +
    x2 * x2 / 120.0 -
    x2 * x2 * x2 / 5040.0 +
    x2 * x2 * x2 * x2 / 362880.0
  x * series
}

///|
fn cos_approx(value : Double) -> Double {
  let x = normalize_angle(value)
  let x2 = x * x
  1.0 -
  x2 / 2.0 +
  x2 * x2 / 24.0 -
  x2 * x2 * x2 / 720.0 +
  x2 * x2 * x2 * x2 / 40320.0
}

///|
fn exp_approx(value : Double) -> Double {
  let mut term = 1.0
  let mut total = 1.0
  for index in 1..<12 {
    term = term * value / index.to_double()
    total = total + term
  }
  total
}

///|
fn safe_divide(
  numerator : Double,
  denominator : Double,
  fallback : Double,
) -> Double {
  if denominator == 0.0 {
    fallback
  } else {
    numerator / denominator
  }
}

///|
pub fn fixed_parameters() -> AdaptiveParameters {
  {
    iteration: 0,
    progress: 0.0,
    inertia_weight: 1.0,
    cognitive_factor: 1.0,
    social_factor: 1.0,
    escape_factor: 1.0,
  }
}

///|
pub fn adaptive_parameters(
  iteration : Int,
  max_iterations : Int,
) -> AdaptiveParameters {
  let t = progress(iteration, max_iterations)
  let alpha = 1.5
  let beta = 1.5
  let a = cos_approx(pi() * t / 2.0)
  let b = sin_approx(pi() * t / 2.0)
  let cognitive = a * cos_approx(pi() * t) + alpha
  let social = b * sin_approx((t + beta) * pi()) + beta
  let y = safe_divide(cognitive - social, cognitive + social, 0.0) * t
  let u = safe_divide(cognitive, social, 1.0) * t
  let inertia = if cognitive >= social {
    (exp_approx(y) - 1.0) / 5.0
  } else {
    safe_divide(1.0, 3.0 * u, 1.0)
  }
  let escape = sin_approx((t + beta) * pi()) + beta
  {
    iteration,
    progress: t,
    inertia_weight: inertia,
    cognitive_factor: cognitive,
    social_factor: social,
    escape_factor: escape,
  }
}
