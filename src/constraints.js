var _graphNodes, _graphLinks, _groups, _gap;

export function computeConstraints(elements, definition, cid, gap, graphNodes, graphLinks, graphGroups) {
  _graphNodes = graphNodes;
  _graphLinks = graphLinks;
  _groups = graphGroups; 
  _gap = gap;

  var results = [];
  var ID = cid + '_' + definition.constraint;
  switch(definition.constraint) {
    case 'align':
      results = results.concat(alignment(elements, definition, ID));
      break;
    case 'order':
      results = results.concat(orderElements(elements, definition, ID));
      break;
    case 'position':
      results = results.concat(position(elements, definition, ID));
      break;
    case 'circle':
      circle(elements, definition, ID);
      break;
    case 'hull':
      hull(elements, definition, ID);
      break;
    case 'cluster':
      cluster(elements, definition, ID);
      break;
    case 'padding':
      padding(elements, definition, ID);
      break;
    default:
      console.error('Unknown constraint type \'' + definition.type + '\'');
  };

  return results;
};

/******************** Alignment Constraints ********************/

function alignment(elements, definition, cid) {
  var nodes = elements;

  // Compute the alignment offset
  var offsets = {};
  nodes.forEach(function(node) {
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
  results = results.concat(CoLaAlignment(nodes, definition.axis, offsets, cid));
  return results;
};

/********************** Order Constraints **********************/

function generateOrderFunc(definition) {
  var order;
  if(definition.hasOwnProperty('order')) {
    if(definition.hasOwnProperty('reverse') && definition.reverse) definition.order.reverse();
    order = function(n1,n2) {
      return definition.order.indexOf(n1[definition.by]) - definition.order.indexOf(n2[definition.by]);
    };
  } else if(definition.hasOwnProperty('reverse') && definition.reverse) {
    order = function(n1,n2) {
      return n1[definition.by] - n2[definition.by];
    };
  } else {
    order = function(n1,n2) {
      return n2[definition.by] - n1[definition.by];
    };
  }
  return order;
};

function orderElements(elements, definition, cid) {
  if(elements[0] instanceof Array) {
   return orderSets(elements, definition, cid);
  } else {
   return orderNodes(elements, definition, cid);
  }
};

function orderNodes(nodes, definition, cid) {
  // Sort the nodes into groups
  var order = generateOrderFunc(definition);
  nodes = nodes.sort(order);

  // Generate the CoLa constraints
  var results = [];
  var axis = definition.axis;
  var gap = definition.gap ? definition.gap : _gap;
  for(var i=0; i<nodes.length-1; i++) {
    var left = nodes[i+1];
    var right = nodes[i]
    results.push(CoLaPosition(left, right, axis, cid, gap));
  };
  return results;
};

function orderSets(elements, definition, cid) {
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
    offset = _gap;
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
      '_cid': cid,
      '_temp': true, 
      'fixed': fixed, 
      'width': nodeSize,
      'height': nodeSize,
      'padding': 0
    };
    node.name = cid + '_boundary_' + i;

    var tempOffset = _graphNodes().filter(function(node) { return node._temp; }).length;

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
    _graphNodes(_graphNodes().concat([node]));
  };

  // Compute the constraints to order the nodes
  var results = [];
  elements.forEach(function(set, index) {
    var left = barriers[index+leftOffset];
    var right = barriers[index+rightOffset];
    var gap = definition.gap ? definition.gap : _gap;

    // Flatten the sets to get to the base nodes.
    var nodes = [].concat.apply([], set);
    nodes.forEach(function(node) {
      if(definition.hasOwnProperty('band') || index != 0) {
        results.push(CoLaPosition(left, node, definition.axis, cid, gap));
      }
      if(definition.hasOwnProperty('band') || index != elements.length-1) {
        results.push(CoLaPosition(node, right, definition.axis, cid, gap));
      }
    });
  });

  return results;
};

function boundaryConstraints(boundaries, definition, cid) {
  var id = cid + '_boundaryDistance';
  var c = [];
  boundaries.forEach(function(boundary,index) {

    for (var i = index+1; i < boundaries.length; i++) {
      var left = boundaries[index];
      var right = boundaries[i];
      var axis = definition.axis;
      var gap = definition.gap * (i - index);
      var newConstraint = CoLaPosition(left, right, axis, id, gap);
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

function position(elements, definition, cid) {
  var nodes;
  if(elements[0] instanceof Array) {
    nodes = [].concat.apply([], elements);
  } else {
    nodes = elements;
  }

  // Get the guide the elements are positioned relative to.
  var guide = _graphNodes().filter(function(node) {
    return node.name === definition.of && node._guide;
  })[0];

  // Create the position constraints relative to the temp node
  var results = [];
  var gap = definition.gap || _gap;
  for(var i=0; i<nodes.length; i++) {
    switch(definition.position) {
      case 'left':
        results.push(CoLaPosition(nodes[i], guide, 'x', cid, gap));
        break;
      case 'right':
        results.push(CoLaPosition(guide, nodes[i], 'x', cid, gap));
        break;
      case 'above':
        results.push(CoLaPosition(nodes[i], guide, 'y', cid, gap));
        break;
      case 'below':
        results.push(CoLaPosition(guide, nodes[i], 'y', cid, gap));
        break;
      default:
        console.error('Unknown position: \'' + definition.position + '\'');
    };
  };

  return results;
};

/********************** Circle Constraints *********************/

function circle(elements, definition, cid) {
  var nodes = elements;

  // Constants for computing edge length
  var gap = definition.gap || _gap;
  var angle = 360/nodes.length;
  var edge = Math.sqrt(2*(gap**2) - 2*(gap**2)*Math.cos(angle/180*Math.PI));

  // Label links that have at least one node in the circle layout
  _graphLinks().forEach(function(link) {
    var source = _graphNodes()[link.source];
    var target = _graphNodes()[link.target];
    if(nodes.indexOf(source) != -1 || nodes.indexOf(target) != -1) {
      link.circle = true;
    }
  });

  // Create links for every node in the circle
  var links = [];
  for (var i = 0; i < nodes.length; i++) {
    var index = i==0 ? nodes.length - 1 : i-1;
    var node = _graphNodes().indexOf(nodes[index]);
    var next = _graphNodes().indexOf(nodes[i]);
    links.push({'source': node, 'target': next, 'length': edge, '_temp': true});
  };

  // Create or extract the center point.
  var center;
  switch(definition.around) {
    case 'center':
      center = {'name': cid + '_center', '_temp': true, '_cid': cid};
      _graphNodes(_graphNodes().concat([center]));
      break;
    default:
      console.error('Missing or unknown center point for the circle constraint.');
  }

  // Create a new link from the center to all nodes in the circle
  nodes.forEach(function(node) {
    links.push({'source': center._id, 'target': node._id, 'length': gap, '_temp': true});
  });
  _graphLinks(_graphLinks().concat(links));
};

/*********************** Hull Constraints **********************/

function hull(elements, definition, cid) {
  var nodes = elements;

  var ids = nodes.map(function(node) { return node._id; });
  var group = {'leaves': ids, '_cid': cid};
  if(definition.style) group.style = definition.style;
  _groups(_groups().concat([group]));
};

/********************* Cluster Constraints *********************/

function cluster(elements, definition, cid) {
  var nodes = elements;

  nodes.forEach(function(node, index) {
    for (var i = index+1; i < nodes.length; i++) {
      _graphLinks(_graphLinks().concat([{
        'source': node._id, 
        'target': nodes[i]._id, 
        'length': 1,
        '_temp': true,
        '_cid': cid
      }]));
    }
  });
};

/********************* Padding Constraints *********************/

function padding(elements, definition, cid) {
  var nodes = elements;

  nodes.forEach(function(node) {
    node.pad = definition.amount;
    node.cid = definition.cid;
    node.spacing = true;
  });

};

/****************** Generate CoLa Constraints ******************/

function CoLaAlignment(nodes, axis, offsets, cid) {
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

function CoLaPosition(left, right, axis, cid, gap) {
  var constraint = {
    'axis': axis,
    'left': left._id,
    'right': right._id,
    'gap': gap,
    '_type': cid
  };
  return constraint;
};