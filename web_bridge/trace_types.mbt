///|
fn event_kind_name(kind : @algorithms.SearchEventKind) -> String {
  match kind {
    @algorithms.Discovered => "discovered"
    @algorithms.Expanded => "expanded"
    @algorithms.Current => "current"
  }
}

///|
fn event_source_json(source : String?) -> String {
  match source {
    Some(value) => quoted(value)
    None => "null"
  }
}

///|
fn search_event_json(event : @algorithms.SearchEvent) -> String {
  "{\"step\":\{event.step},\"kind\":\{quoted(event_kind_name(event.kind))},\"point\":\{point_json(event.point)},\"frontierSize\":\{event.frontier_size},\"source\":\{event_source_json(event.source)}}"
}

///|
fn trace_json(trace : @algorithms.SearchTrace) -> String {
  let mut events = "["
  for index, event in trace.events {
    if index > 0 {
      events = events + ","
    }
    events = events + search_event_json(event)
  }
  events = events + "]"
  if trace.supported {
    "{\"supported\":true,\"mode\":\"recorded\",\"totalSteps\":\{trace.total_steps},\"events\":\{events}}"
  } else {
    "{\"supported\":false,\"mode\":\"none\",\"totalSteps\":0,\"events\":[]}"
  }
}
