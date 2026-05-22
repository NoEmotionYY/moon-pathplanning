///|
struct ParentEntry {
  point : @core.Point
  parent : @core.Point
  cost : Double
}

///|
struct ScoreEntry {
  point : @core.Point
  score : Double
  priority : Double
}

///|
fn contains_point(points : Array[@core.Point], point : @core.Point) -> Bool {
  for item in points {
    if item.same(point) {
      return true
    }
  }
  false
}

///|
fn has_parent(parents : Array[ParentEntry], point : @core.Point) -> Bool {
  for entry in parents {
    if entry.point.same(point) {
      return true
    }
  }
  false
}

///|
fn parent_for(
  parents : Array[ParentEntry],
  point : @core.Point,
) -> ParentEntry? {
  for entry in parents {
    if entry.point.same(point) {
      return Some(entry)
    }
  }
  None
}

///|
fn set_parent(
  parents : Array[ParentEntry],
  point : @core.Point,
  parent : @core.Point,
  cost : Double,
) -> Unit {
  for index, entry in parents {
    if entry.point.same(point) {
      parents[index] = { point, parent, cost }
      return
    }
  }
  parents.push({ point, parent, cost })
}

///|
fn point_path(
  parents : Array[ParentEntry],
  start : @core.Point,
  goal : @core.Point,
) -> Array[@core.Point] {
  let reversed = [goal]
  let mut cursor = goal
  while !cursor.same(start) {
    match parent_for(parents, cursor) {
      Some(entry) => {
        cursor = entry.parent
        reversed.push(cursor)
      }
      None => return []
    }
  }
  let path = []
  let mut index = reversed.length()
  while index > 0 {
    index = index - 1
    path.push(reversed[index])
  }
  path
}

///|
fn path_cost(
  parents : Array[ParentEntry],
  start : @core.Point,
  goal : @core.Point,
) -> Double {
  let mut total = 0.0
  let mut cursor = goal
  while !cursor.same(start) {
    match parent_for(parents, cursor) {
      Some(entry) => {
        total = total + entry.cost
        cursor = entry.parent
      }
      None => return 0.0
    }
  }
  total
}

///|
fn score_for(scores : Array[ScoreEntry], point : @core.Point) -> Double? {
  for entry in scores {
    if entry.point.same(point) {
      return Some(entry.score)
    }
  }
  None
}

///|
fn set_score(
  scores : Array[ScoreEntry],
  point : @core.Point,
  score : Double,
  priority : Double,
) -> Unit {
  for index, entry in scores {
    if entry.point.same(point) {
      scores[index] = { point, score, priority }
      return
    }
  }
  scores.push({ point, score, priority })
}

///|
fn pop_best(frontier : Array[ScoreEntry]) -> ScoreEntry? {
  if frontier.is_empty() {
    return None
  }
  let mut best_index = 0
  for index, entry in frontier {
    if entry.priority < frontier[best_index].priority {
      best_index = index
    }
  }
  let chosen = frontier[best_index]
  let last = frontier.pop()
  match last {
    Some(last_entry) => {
      if best_index < frontier.length() {
        frontier[best_index] = last_entry
      }
    }
    None => ()
  }
  Some(chosen)
}

