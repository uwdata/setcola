var layout = {};
var INDEX = 0;

/***************************************************************/
/********************** CONSTRAINT LAYOUT **********************/
/***************************************************************/

// Convert the user defined constraints into cola constraints
layout.getConstraints = function() {
  if(renderer.options['debugprint']) console.log('  Computing cola constraints...');

  layout.sets = {};
  layout.groups = [];
  INDEX = 0;

  // Add an _id to the nodes
  layout.index = -1;
  graph.spec.nodes.map(graph.setID);
  graph.computeBuiltInProperties(graph.spec.constraintDefinitions);
  graph.removeTempNodes();

  // Create the guides
  if(!graph.spec.guides) graph.spec.guides = [];
  layout.guides = [].concat.apply([], graph.spec.guides.map(newGuide));

  // Process the constraints
  var constraints = [].concat.apply([], graph.spec.constraintDefinitions.map(processConstraint));
  return {'constraints': constraints, 'groups': layout.groups};
};

// Process each user defined constraint.
function processConstraint(definition) {
  if(renderer.options['debugprint']) console.log('    Processing constraint \'' + definition.name + '\'...', definition);

  // Get the source.
  var source;
  if(definition.from && typeof definition.from === 'string') {
    source = layout.sets[definition.from];
  } else if(definition.from) {
    source = createSet(graph.spec.nodes, definition.from);
  } else {
    source = graph.spec.nodes;
  }

  // Create the sets
  var name = definition.name;
  if(!name) {
    name = 'set' + INDEX;
    definition.name = name;
    INDEX += 1;
  }
  layout.sets[name] = createSet(source, definition.sets);

  // Create the constraints
  var results = [];
  (definition.forEach || []).forEach(function(constraint) {
    (layout.sets[name] || []).forEach(function(elements) {
      results = results.concat(constraintDef.generateConstraints(elements, constraint, name));
    });    
  });

  return results;
};

function newGuide(guide) {
  var nodeSize = 1;
  var node = { 
    'fixed': true, 
    'temp': true, 
    'guide': true,
    'width': nodeSize,
    'height': nodeSize,
    'padding': 0
  };

  var offset = graph.spec.nodes.filter(function(node) { 
    return node.temp; 
  }).length;

  // Save the position information from the guide.
  if(guide.hasOwnProperty('x') && guide.hasOwnProperty('y')) {
    node.boundary = 'xy';
    node.x = guide.x;
    node.y = guide.y;
  } else if(guide.hasOwnProperty('x')) {
    node.boundary = 'x';
    node.x = guide.x;
    node.y = offset*nodeSize*10;
  } else if(guide.hasOwnProperty('y')) {
    node.boundary = 'y';
    node.y = guide.y;
    node.x = offset*nodeSize*10;
  } else {
    console.error('Guide must have an x and/or y position: ', guide);
  }

  // Save the name from the guide.
  if(guide.hasOwnProperty('name')) {

    var found = graph.spec.nodes.filter(function(node) { 
      return node.name === guide.name; 
    });

    if(found.length > 0) {
      console.error('A node with the name ' + guide.name + ' already exists.');
    } else {
      node.name = guide.name;
    }

  } else {
    console.error('Guide must have a name: ', guide);
  }
  
  // Save the guide and get it's index.
  graph.spec.nodes.push(node);
  node._id = graph.spec.nodes.indexOf(node);
  return node;
};
