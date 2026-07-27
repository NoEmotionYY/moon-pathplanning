///|
pub(all) enum SearchEventKind {
  Discovered
  Expanded
  Current
} derive(Debug)

///|
pub(all) struct SearchEvent {
  step : Int
  kind : SearchEventKind
  point : @core.Point
  frontier_size : Int
  source : String?
} derive(Debug)

///|
pub(all) struct SearchTrace {
  supported : Bool
  events : Array[SearchEvent]
  total_steps : Int
} derive(Debug)

///|
pub(all) struct TracedPathResult {
  result : @core.PathResult
  trace : SearchTrace
} derive(Debug)

///|
fn record_event(
  events : Array[SearchEvent],
  kind : SearchEventKind,
  point : @core.Point,
  frontier_size : Int,
  source? : String,
) -> Unit {
  events.push({ step: events.length(), kind, point, frontier_size, source })
}

///|
fn recorded_result(
  result : @core.PathResult,
  events : Array[SearchEvent],
) -> TracedPathResult {
  { result, trace: { supported: true, events, total_steps: events.length() } }
}

///|
pub fn without_trace(result : @core.PathResult) -> TracedPathResult {
  { result, trace: { supported: false, events: [], total_steps: 0 } }
}
