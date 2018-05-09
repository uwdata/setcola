var graph = {};

/***************************************************************/
/**************************** GRAPH ****************************/
/***************************************************************/

graph.init = function(spec) {
  graph.spec = spec;
  graph.hidden_constraints = [];

  // Set graph options
  var type = graph.spec.nodes[0][renderer.options['fillprop']];
  graph.color = (typeof type == 'string') ? d3.scaleOrdinal(d3.schemeDark2) : d3.scaleSequential(d3.interpolateYlGnBu);
};

graph.hasProperty = function(constraint, property) {
  return JSON.stringify(constraint).indexOf(property) != -1;
};

graph.computeBuiltInProperties = function(constraint) {
  if(renderer.options['debugprint']) console.log('      Computing built in properties.');
  graph.spec.nodes.forEach(graph.setID);
  graph.spec.links.forEach(graph.setLinkID);
  if(typeof graph.spec.links[0].source !== 'number') graph.modifyLinks();

  if(graph.hasProperty(constraint, 'depth')) calculateDepths();
  if(graph.hasProperty(constraint, 'sources')) calculateSources();
  if(graph.hasProperty(constraint, 'targets')) calculateTargets();
  if(graph.hasProperty(constraint, 'neighbors')) calculateNeighbors();
  if(graph.hasProperty(constraint, 'incoming')) calculateIncoming();
  if(graph.hasProperty(constraint, 'outgoing')) calculateOutgoing();
  if(graph.hasProperty(constraint, 'edges')) calculateEdges();
  if(graph.hasProperty(constraint, 'degree')) calculateDegree();
  if(graph.hasProperty(constraint, 'firstchild')) calculateFirstChild();
};

graph.removeTempNodes = function() {
  graph.spec.nodes = graph.spec.nodes.filter(function(node) {
    return node.temp == null;
  });
};

graph.modifyLinks = function() {
  // TODO: need to somehow autodetect what the ID is using
  graph.spec.links.forEach(function(link) {
    link.source = graph.spec.nodes.filter(function(node) { return node.id == link.source; })[0]._id;
    link.target = graph.spec.nodes.filter(function(node) { return node.id == link.target; })[0]._id;
  })
};

// TODO: this won't work with cycles
function calculateDepths() {
  if(renderer.options['debugprint']) console.log('        Computing depths.');
  graph.spec.nodes.forEach(graph.setID);
  var roots = graph.sources();
  var depth = 0;
  while(roots.length > 0) {
    var nextLevel = [];
    roots.forEach(function(rootNode) { 
      rootNode.depth = depth;
      var links = graph.getOutgoing(rootNode);
      var children = links.map(function(link) { return graph.spec.nodes[link.target]; });
      children = children.filter(function(node) { return !node.depth; });
      nextLevel = nextLevel.concat(children);
    });
    depth += 1;
    roots = nextLevel;
  }
};

function calculateSources() {
  if(renderer.options['debugprint']) console.log('        Computing sources.');
  graph.spec.nodes.forEach(function(node) {
    node.sources = node.sources || graph.getSources(node);
  });
};

function calculateTargets() {
  if(renderer.options['debugprint']) console.log('        Computing targets.');
  graph.spec.nodes.forEach(function(node) {
    node.targets = node.targets || graph.getTargets(node);
  });
};

function calculateIncoming() {
  if(renderer.options['debugprint']) console.log('        Computing incoming.');
  graph.spec.nodes.forEach(function(node) {
    node.incoming = node.incoming || graph.getIncoming(node);
  });
};

function calculateOutgoing() {
  if(renderer.options['debugprint']) console.log('        Computing outgoing.');
  graph.spec.nodes.forEach(function(node) {
    node.outgoing = node.outgoing || graph.getOutgoing(node);
  });
};

function calculateNeighbors() {
  if(renderer.options['debugprint']) console.log('        Computing neighbors.');
  graph.spec.nodes.forEach(function(node) {
    node.neighbors = node.neighbors || graph.getNeighbors(node);
  });
};

function calculateEdges() {
  if(renderer.options['debugprint']) console.log('        Computing edges.');
  graph.spec.nodes.forEach(function(node) {
    node.edges = node.edges || graph.getEdges(node);
  });
};

function calculateDegree() {
  if(renderer.options['debugprint']) console.log('        Computing degree.');
  graph.spec.nodes.forEach(function(node) {
    node.degree = node.degree || graph.getDegree(node);
  });
};

function calculateFirstChild() {
  if(renderer.options['debugprint']) console.log('        Computing first child.');
  graph.spec.nodes.forEach(function(node) {
    node.firstchild = node.firstchild || graph.getFirstChild(node);
  });
};

graph.sources = function() {
  return graph.spec.nodes.filter(function(node) {
    if(node.hasOwnProperty('_isSource')) return node._isSource;
    var incoming = graph.getIncoming(node);
    incoming = incoming.filter(function(n) { return n.source !== n.target; });
    return incoming.length === 0;
  });
};

graph.sinks = function() {
  return graph.spec.nodes.filter(function(node) {
    return graph.getOutgoing(node).length === 0;
  });
};

/********************* Set Node Properties *********************/

graph.setSize = function(node) {
  var pad = node.pad ? node.pad : renderer.options['nodepad'];
  var size = node.size ? node.size : renderer.options['nodesize'];
  node.width = node.width ? node.width + 2*pad : size + 2*pad;
  node.height = node.height ? node.height + 2*pad : size + 2*pad;
  node.padding = pad;
};

graph.setID = function(node) {
  node._id = node._id || graph.spec.nodes.indexOf(node);
};

graph.setLinkID = function(link) {
  link._id = link._id || graph.spec.links.indexOf(link);
};

graph.setColor = function(node) {
  var value = node[renderer.options['fillprop']] || 0.5;
  if(renderer.options['fillprop'] === 'color') {
    node.color = node.color; // Don't change the color
  } else if(typeof value == 'number') {
    var max = Math.max(...graph.spec.nodes.map(function(n) { return n[renderer.options['fillprop']] || 0.5; }));
    node.color = graph.color(value / max);
  } else {
    node.color = graph.color(value);
  }
};

/********************* Get Node Properties *********************/

graph.getLabel = function(node) {
  return node[renderer.options['labelprop']] || node.name || node._id;
};

graph.getColor = function(node) {
  var value = node[renderer.options['fillprop']] || 0.5;
  return node.color || graph.color(value);
};

graph.getStroke = function(node) {
  var value = 'white';
  if(node.guide) return node.stroke || '#f6c5c5';
  if(node.temp) return node.stroke || '#ddd';
  return node.stroke || style.nodeStroke(node) || value;
};

graph.getPadding = function(node) {
  var value = renderer.options['nodepad'];
  return node.pad || node.padding || value;
};

graph.getSources = function(node) {
  var incoming = graph.getIncoming(node);
  var sources = incoming.map(function(link) {
    return (typeof link.source === 'object') ? link.source._id : link.source;
  });
  return sources;
};

graph.getTargets = function(node) {
  var outgoing = graph.getOutgoing(node);
  var targets = outgoing.map(function(link) {
    return (typeof link.target == 'object') ? link.target._id : link.target;
  });
  return targets;
};

graph.getNeighbors = function(node) {
  var sources = node.sources || graph.getSources(node);
  var targets = node.targets || graph.getTargets(node);
  return sources.concat(targets);
};

graph.getIncoming = function(node) {
  var index = node._id;
  var incoming = graph.spec.links.filter(function(link) { 
    var source = (typeof link.source === 'object') ? link.source._id : link.source;
    var target = (typeof link.target === 'object') ? link.target._id : link.target;
    return target == index && source !== index;
  });
  return incoming;
};

graph.getOutgoing = function(node) {
  var index = node._id;
  var outgoing = graph.spec.links.filter(function(link) { 
    var source = (typeof link.source === 'object') ? link.source._id : link.source;
    var target = (typeof link.target === 'object') ? link.target._id : link.target;
    return source == index && target !== index; 
  });
  return outgoing;
};

graph.getEdges = function(node) {
  var incoming = node.incoming || graph.getIncoming(node);
  var outgoing = node.outgoing || graph.getOutgoing(node);
  return incoming.concat(outgoing);
};

graph.getDegree = function(node) {
  var incoming = node.incoming || graph.getIncoming(node);
  var outgoing = node.outgoing || graph.getOutgoing(node);
  return incoming.length + outgoing.length;
};

graph.getFirstChild = function(node) {
  var outgoing = node.outgoing || graph.getOutgoing(node);
  outgoing = outgoing.sort(function(a,b) { return a._id - b._id; });
  outgoing = outgoing.filter(function(n) { return n.target !== n.source; });
  if(outgoing.length == 0) return null;
  return graph.spec.nodes[outgoing[0].target];
};
