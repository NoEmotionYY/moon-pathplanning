///|
pub(all) struct WeightedEdge {
  from : @core.Point
  to : @core.Point
  weight : Double
} derive(Debug)

///|
pub(all) struct WeightedGraph {
  nodes : Array[@core.Point]
  edges : Array[WeightedEdge]
} derive(Debug)

///|
pub fn new_weighted_graph() -> WeightedGraph {
  { nodes: [], edges: [] }
}

///|
fn copy_nodes(nodes : Array[@core.Point]) -> Array[@core.Point] {
  let copied = []
  for node in nodes {
    copied.push(node)
  }
  copied
}

///|
fn copy_edges(edges : Array[WeightedEdge]) -> Array[WeightedEdge] {
  let copied = []
  for edge in edges {
    copied.push(edge)
  }
  copied
}

///|
pub fn WeightedGraph::has_node(
  self : WeightedGraph,
  point : @core.Point,
) -> Bool {
  for node in self.nodes {
    if node.same(point) {
      return true
    }
  }
  false
}

///|
pub fn WeightedGraph::with_node(
  self : WeightedGraph,
  point : @core.Point,
) -> WeightedGraph {
  if self.has_node(point) {
    self
  } else {
    let nodes = copy_nodes(self.nodes)
    nodes.push(point)
    { nodes, edges: copy_edges(self.edges) }
  }
}

///|
pub fn WeightedGraph::without_node(
  self : WeightedGraph,
  point : @core.Point,
) -> WeightedGraph {
  let nodes = []
  let edges = []
  for node in self.nodes {
    if !node.same(point) {
      nodes.push(node)
    }
  }
  for edge in self.edges {
    if !edge.from.same(point) && !edge.to.same(point) {
      edges.push(edge)
    }
  }
  { nodes, edges }
}

///|
fn edge_matches(
  edge : WeightedEdge,
  from : @core.Point,
  to : @core.Point,
) -> Bool {
  edge.from.same(from) && edge.to.same(to)
}

///|
pub fn WeightedGraph::with_edge(
  self : WeightedGraph,
  from : @core.Point,
  to : @core.Point,
  weight : Double,
) -> WeightedGraph {
  let graph = self.with_node(from).with_node(to)
  let edges = []
  for edge in graph.edges {
    if !edge_matches(edge, from, to) {
      edges.push(edge)
    }
  }
  edges.push({ from, to, weight })
  { nodes: copy_nodes(graph.nodes), edges }
}

///|
pub fn WeightedGraph::without_edge(
  self : WeightedGraph,
  from : @core.Point,
  to : @core.Point,
) -> WeightedGraph {
  let edges = []
  for edge in self.edges {
    if !edge_matches(edge, from, to) {
      edges.push(edge)
    }
  }
  { nodes: copy_nodes(self.nodes), edges }
}

///|
pub fn WeightedGraph::neighbors(
  self : WeightedGraph,
  from : @core.Point,
) -> Array[WeightedEdge] {
  let neighbors = []
  for edge in self.edges {
    if edge.from.same(from) {
      neighbors.push(edge)
    }
  }
  neighbors
}

///|
pub fn WeightedGraph::edge_weight(
  self : WeightedGraph,
  from : @core.Point,
  to : @core.Point,
) -> Double? {
  for edge in self.edges {
    if edge_matches(edge, from, to) {
      return Some(edge.weight)
    }
  }
  None
}
