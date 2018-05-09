var constraintDef = {};

constraintDef.generateConstraints = function(elements, definition, cid) {
  if(renderer.options['debugprint']) console.log('      Adding cola constraints...');
  
  var results = [];
  var ID = cid + '_' + definition.constraint;
  switch(definition.constraint) {
    case 'align':
      results = results.concat(constraintDef.alignment(elements, definition, ID));
      break;
    case 'order':
      results = results.concat(constraintDef.order(elements, definition, ID));
      break;
    case 'position':
      results = results.concat(constraintDef.position(elements, definition, ID));
      break;
    case 'circle':
      constraintDef.circle(elements, definition, ID);
      break;
    case 'hull':
      constraintDef.hull(elements, definition, ID);
      break;
    case 'cluster':
      constraintDef.cluster(elements, definition, ID);
      break;
    case 'padding':
      constraintDef.padding(elements, definition, ID);
      break;
    default:
      console.error('Unknown constraint type \'' + definition.type + '\'');
  };

  if(renderer.options['debugprint']) console.log('      Returning cola constraints...', results);
  return results;
};

/******************** Alignment Constraints ********************/

constraintDef.alignment = function(elements, definition, cid) {
  var nodes = elements;

  // Compute the alignment offset
  var offsets = {};
  nodes.forEach(function(node) {
   var padding = graph.getPadding(node);
   switch(definition.orientation) {
     case 'top':
      offsets[node._id] = node.height/2;
      break;
     case 'bottom':
      offsets[node._id] = -node.height/2;
      break;
     case 'left':
      offsets[node._id] = node.width/2;
      break;
     case 'right':
      offsets[node._id] = -node.width/2;
      break;
     default:
      offsets[node._id] = 0; 
   }
  });

  // Generate the CoLa constraints
  var results = [];
  results = results.concat(constraintDef.CoLaAlignment(nodes, definition.axis, offsets, cid));
  return results;
};

/********************** Order Constraints **********************/

function generateOrderFunc(def) {
  var order;
  if(def.hasOwnProperty('order')) {
    if(def.hasOwnProperty('reverse')) def.order.reverse();
    order = function(n1,n2) {
      return def.order.indexOf(n1[def.by]) - def.order.indexOf(n2[def.by]);
    };
  } else if(def.hasOwnProperty('reverse') && def.reverse) {
    order = function(n1,n2) {
      return n1[def.by] - n2[def.by];
    };
  } else {
    order = function(n1,n2) {
      return n2[def.by] - n1[def.by];
    };
  }
  return order;
};

constraintDef.order = function(elements, definition, cid) {
  if(elements[0] instanceof Array) {
   return constraintDef.orderSets(elements, definition, cid);
  } else {
   return constraintDef.orderNodes(elements, definition, cid);
  }
};

constraintDef.orderNodes = function(nodes, definition, cid) {
  // Sort the nodes into groups
  var order = generateOrderFunc(definition);
  nodes = nodes.sort(order);

  // Generate the CoLa constraints
  var results = [];
  var axis = definition.axis;
  var gap = definition.gap ? definition.gap : renderer.options['constgap'];
  for(var i=0; i<nodes.length-1; i++) {
    var left = nodes[i+1];
    var right = nodes[i]
    results.push(constraintDef.CoLaPosition(left, right, axis, cid, gap));
  };
  return results;
};

constraintDef.orderSets = function(elements, definition, cid) {
  // Sort the elements into groups
  var order = generateOrderFunc(definition);
  elements = elements.sort(order);

  // Compute the band for the nodes
  var upperbound, offset, leftOffset, rightOffset, fixed;
  if(definition.band) {
    upperbound = elements.length;
    offset = definition.band;
    leftOffset = 0;
    rightOffset = 1;
    fixed = true;
  } else {
    upperbound = elements.length-2;
    offset = renderer.options['constgap'];
    leftOffset = -1;
    rightOffset = 0;
    fixed = true;
  }

  // Create a new node at the barrier of each band
  var barriers = [];
  var nodeSize = 1;
  var prev = 0;
  for(var i = 0; i <= upperbound; i++) {
    var node = {
      'temp': true, 
      'fixed': fixed, 
      'cid': cid,
      'width': nodeSize,
      'height': nodeSize,
      'padding': 0
    };
    node.name = cid + '_boundary_' + i;

    var tempOffset = graph.spec.nodes.filter(function(node) { 
      return node.temp; 
    }).length;

    var other = definition.axis == 'x' ? 'y' : 'x';
    node.boundary = definition.axis;
    if(definition.band) {
      node[definition.axis] = i*offset;
    } else {
      var offsetTest = (Math.sqrt(elements[i+1].length) + 2) * elements[i+1][0].size + prev;
      node[definition.axis] = i*offset;
    }
    node[other] = tempOffset*nodeSize*10;
    
    barriers.push(node);
    graph.spec.nodes.push(node);
    node._id = graph.spec.nodes.indexOf(node);
  };

  // Compute the constraints to order the nodes
  var results = [];
  elements.forEach(function(set, index) {
    var left = barriers[index+leftOffset];
    var right = barriers[index+rightOffset];
    var gap = definition.gap ? definition.gap : renderer.options['constgap'];

    // Flatten the sets to get to the base nodes.
    var nodes = [].concat.apply([], set);
    nodes.forEach(function(node) {
      if(definition.hasOwnProperty('band') || index != 0) {
        results.push(constraintDef.CoLaPosition(left, node, definition.axis, cid, gap));
      }
      if(definition.hasOwnProperty('band') || index != elements.length-1) {
        results.push(constraintDef.CoLaPosition(node, right, definition.axis, cid, gap));
      }
    });
  });

  return results;
};

boundaryConstraints = function(boundaries, definition, cid) {
  var id = cid + '_boundaryDistance';
  var c = [];
  boundaries.forEach(function(boundary,index) {

    for (var i = index+1; i < boundaries.length; i++) {
      var left = boundaries[index];
      var right = boundaries[i];
      var axis = definition.axis;
      var gap = definition.gap * (i - index);
      var newConstraint = constraintDef.CoLaPosition(left, right, axis, id, gap);
      newConstraint.equality = true;
      if(definition.band) {
        newConstraint.gap = definition.band
      }
      c.push(newConstraint);
    }

  });

  return c;
};

/********************* Position Constraints ********************/

constraintDef.position = function(elements, definition, cid) {
  var nodes;
  if(elements[0] instanceof Array) {
    nodes = [].concat.apply([], elements);
  } else {
    nodes = elements;
  }

  // Get the guide the elements are positioned relative to.
  var guide = graph.spec.nodes.filter(function(node) {
    return node.name === definition.of && node.guide;
  })[0];

  // Create the position constraints relative to the temp node
  var results = [];
  var gap = definition.gap || renderer.options['constgap'];
  for(var i=0; i<nodes.length; i++) {
    switch(definition.position) {
      case 'left':
        results.push(constraintDef.CoLaPosition(nodes[i], guide, 'x', cid, gap));
        break;
      case 'right':
        results.push(constraintDef.CoLaPosition(guide, nodes[i], 'x', cid, gap));
        break;
      case 'above':
        results.push(constraintDef.CoLaPosition(nodes[i], guide, 'y', cid, gap));
        break;
      case 'below':
        results.push(constraintDef.CoLaPosition(guide, nodes[i], 'y', cid, gap));
        break;
      default:
        console.error('Unknown position: \'' + definition.position + '\'');
    };
  };

  return results;
};

/********************** Circle Constraints *********************/

constraintDef.circle = function(elements, definition, cid) {
  var nodes = elements;

  // Constants for computing edge length
  var gap = definition.gap || renderer.options['constgap'];
  var angle = 360/nodes.length;
  var edge = Math.sqrt(2*(gap**2) - 2*(gap**2)*Math.cos(angle/180*Math.PI));

  // Label links that have at least one node in the circle layout
  graph.spec.links.forEach(function(link) {
    var source = graph.spec.nodes[link.source];
    var target = graph.spec.nodes[link.target];
    if(nodes.indexOf(source) != -1 || nodes.indexOf(target) != -1) {
      link.circle = true;
    }
  });

  // Create links for every node in the circle
  var links = [];
  for (var i = 0; i < nodes.length; i++) {
    var index = i==0 ? nodes.length - 1 : i-1;
    var node = graph.spec.nodes.indexOf(nodes[index]);
    var next = graph.spec.nodes.indexOf(nodes[i]);
    links.push({'source': node, 'target': next, 'temp': true, 'length': edge});
  };

  // Create or extract the center point.
  var center;
  switch(definition.around) {
    case 'center':
      center = {'temp': true, 'name': cid + '_center'};
      graph.spec.nodes.push(center);
      center._id = graph.spec.nodes.indexOf(center);
      break;
    default:
      console.error('Missing or unknown center point for the circle constraint.');
  }

  // Create a new link from the center to all nodes in the circle
  nodes.forEach(function(node) {
    links.push({'source': center._id, 'target': node._id, 'temp': true, 'length': gap});
  });
  graph.spec.links = graph.spec.links.concat(links);
};

/*********************** Hull Constraints **********************/

constraintDef.hull = function(elements, definition, cid) {
  var nodes = elements;

  var ids = nodes.map(function(node) { return node._id; });
  var group = {"leaves": ids};
  if(definition.style) group.style = definition.style;
  layout.groups.push(group);
};

/********************* Cluster Constraints *********************/

constraintDef.cluster = function(elements, definition, cid) {
  var nodes = elements;

  nodes.forEach(function(node, index) {
    for (var i = index+1; i < nodes.length; i++) {
      graph.spec.links.push({
        'source': node._id, 
        'target': nodes[i]._id, 
        'temp': true, 
        'length': 1
      });
    }
  });
};

/********************* Padding Constraints *********************/

constraintDef.padding = function(elements, definition, cid) {
  var nodes = elements;

  nodes.forEach(function(node) {
    node.pad = definition.amount;
    node.cid = definition.cid;
    node.spacing = true;
  });

};

/****************** Generate CoLa Constraints ******************/

constraintDef.CoLaAlignment = function(nodes, axis, offsets, cid) {
  var constraint = {
    'type': 'alignment',
    'axis': (axis == 'x') ? 'y' : 'x',
    'offsets': [],
    '_type': cid
  };
  nodes.forEach(function(node) {
    constraint.offsets.push({'node': node._id, 'offset': offsets[node._id]});
  });
  return constraint;
};

constraintDef.CoLaPosition = function(left, right, axis, cid, gap) {
  var constraint = {
    'axis': axis,
    'left': graph.spec.nodes.indexOf(left),
    'right': graph.spec.nodes.indexOf(right),
    'gap': gap,
    '_type': cid
  };
  return constraint;
};