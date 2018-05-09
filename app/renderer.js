var renderer = {};
var style = styling;

var RANGES = ['noconst', 'userconst', 'layoutconst', 'linkdist', 'jaccard', 'symmetric', 'constgap', 'nodesize', 'nodepad'];
var CHECKS = ['debugprint', 'layoutnode', 'layoutboundary', 'overlaps', 'arrows', 'curved', 'multiple', 'edgelabels'];
var TEXTS = ['edgeref', 'fillprop'];

/***************************************************************/
/************************ GRAPH DRAWING ************************/
/***************************************************************/

renderer.init = function() {
  renderer.options = {};
  renderer.setOptions(styling.options);
  renderer.hidden_constraints = [];
};

renderer.setOptions = function(options) {
  renderer.options = Object.assign(renderer.options, styling.options);
  renderer.options = Object.assign(renderer.options, options);

  RANGES.map(function(range) { document.getElementById('range-' + range).value =  renderer.options[range] });
  CHECKS.map(function(check) { document.getElementById('check-' + check).checked =  renderer.options[check] });
  TEXTS.map(function(text) { document.getElementById('text-' + text).value =  renderer.options[text] });

  RANGES.map(updateRange);
  CHECKS.map(updateCheck);
  TEXTS.map(updateText);
};

renderer.setStyle = function(name) {

  // Use the same name for all specs with 'innatedb' in the name
  if(name.indexOf('innatedb') !== -1) name = 'innatedb';

  // Normal styling behavior
  switch(name) {
    case 'kruger-foodWeb':
      style = kruger;
      break;
    case 'serengeti-foodWeb':
      style = serengeti;
      break;
    case 'syphilis':
      style = syphilis;
      break;
    case 'tlr4':
      style = tlr4;
      break;
    case 'innatedb':
      style = innatedb;
      break;
    default:
      style = styling;
  };

  if(style.options) renderer.setOptions(style.options);
};

renderer.draw = function(layout) {
  if(renderer.options['debugprint']) console.log('  Drawing the graph...');
  renderer.setcola = layout;

  // Set the default graph options if they do not exist.
  renderer.defaultOptions(layout);

  // Clear the old graph
  d3.select('.graph').selectAll('g').remove();

  // Setup Cola
  var width = d3.select('svg').style('width').replace('px', ''),
      height = d3.select('svg').style('height').replace('px', '');
  renderer.colajs = cola.d3adaptor(d3).size([width, height]);

  // Add the graph to the layout
  if(renderer.setcola.nodes) renderer.colajs.nodes(renderer.setcola.nodes);
  if(renderer.setcola.links) {
    renderer.colajs.links(renderer.setcola.links);
    
    // Apply the appropriate edge link to circle edges
    renderer.colajs.linkDistance(function(d) { return d.length ? d.length : 100; });

    // For all the links that were filtered out prior to the layout, fix the node linking
    renderer.setcola.links.forEach(function(link) {
      if(typeof link.source === 'number' || typeof link.target === 'number') {
        link.source = renderer.setcola.nodes[link.source];
        link.target = renderer.setcola.nodes[link.target];
      }
    });
  }
  if(renderer.setcola.groups) renderer.colajs.groups(renderer.setcola.groups);
  if(renderer.setcola.constraints) renderer.colajs.constraints(renderer.setcola.constraints);

  // Start the cola.js layout
  renderer.colajs
      .avoidOverlaps(renderer.options['overlaps'])
      .convergenceThreshold(1e-3)
      .handleDisconnected(false);

  if(renderer.options['linkdist'] != 0 ) {
    renderer.colajs.linkDistance(function(d) {
      var linkDistance = renderer.options['linkdist'];
      if(d.hasOwnProperty('temp')) linkDistance = renderer.options['nodesize']/2;
      if(d.hasOwnProperty('length')) linkDistance = d.length;
      return linkDistance;
    });
  };
  if(renderer.options['jaccard'] != 0) renderer.colajs.jaccardLinkLengths(renderer.options['jaccard']);
  if(renderer.options['symmetric'] != 0) renderer.colajs.symmetricDiffLinkLengths(renderer.options['symmetric']);
  
  // Start the layout engine.
  renderer.colajs
    .start(renderer.options['noconst'],renderer.options['userconst'],renderer.options['layoutconst'])
    .on('tick', renderer.tick);

  // Set up zoom behavior on the graph svg.
  renderer.zoom = d3.behavior.zoom().scaleExtent([0.25, 2]).on('zoom', zoomed);

  var svg = d3.select('.graph').append('g')
      .attr('transform', 'translate(0,0)')
    .call(renderer.zoom)
    .on('click', renderer.opacity);

  // Draw an invisible background to capture zoom events
  var rect = d3.select('.graph').select('g').append('rect')
      .attr('id', 'zoomr')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'white');

  // Draw the graph
  renderer.svg = svg.append('g').attr('id', 'zoomg');
  renderer.options['curved'] ? renderer.drawCurvedLinks() : renderer.options['multiple'] ? renderer.drawMultipleLinks() : renderer.drawLinks();
  if(renderer.setcola.groups) renderer.drawGroups();
  renderer.drawNodes();

  // Draw the boundaries
  if(renderer.options['layoutboundary']) renderer.showLayoutBoundaries();

  renderer.centerGraph();
};

renderer.restart = function() {
  renderer.colajs
    .nodes(renderer.setcola.nodes)
    .links(renderer.setcola.links)
    .constraints(renderer.setcola.constraints)
    .start(renderer.options['noconst'],renderer.options['userconst'],renderer.options['layoutconst']);
};

renderer.drawLinks = function() {

  renderer.links = renderer.svg.selectAll('.link')
      .data(renderer.setcola.links)
    .enter().append('line')
      .attr('class', function(d) {
        var className = 'link';
        if(d._temp) {
          if(renderer.options['layoutnode']) className += ' visible';
          if(!renderer.options['layoutnode']) className += ' hidden';
        }
        return className;
      })
      .style('stroke', function(d) { 
        if(d.guide) return 'red';
        if(renderer.options['layoutnode'] && d._temp) return '#ddd';
        return d.color; 
      })
      .style('stroke-dasharray', function(d) {
        if(d.style === 'dashed') return '3 3';
      });

  if(renderer.options['arrows']) renderer.drawArrowheads();
  if(renderer.options['edgelabels']) renderer.drawLinkLabels();  
};

renderer.drawCurvedLinks = function() {
  renderer.diagonal = d3.svg.diagonal()
        .source(function(d) { return {'x':d.source.x - d.source.pad, 'y':d.source.y - d.source.pad}; })            
        .target(function(d) { return {'x':d.target.x - d.target.pad, 'y':d.target.y - d.target.pad}; })
        .projection(function(d) { return [d.x, d.y]; });

  renderer.links = renderer.svg.selectAll('.link')
      .data(renderer.setcola.links)
    .enter().append('path')
      .attr('class', function(d) {
        var className = 'link';
        if(d._temp) {
          if(renderer.options['layoutnode']) className += ' visible';
          if(!renderer.options['layoutnode']) className += ' hidden';
        }
        return className;
      })
      .attr('d', function(d) {
        if(d.source == d.target) return arcPath(true, d);
        return renderer.diagonal(d);
      })
      .style('stroke', function(d) { return d.color; })
      .style('fill', 'transparent');

  if(renderer.options['arrows']) renderer.drawArrowheads();
  if(renderer.options['edgelabels']) renderer.drawLinkLabels(); 
};

var countSiblingLinks = function(source, target) {
  var count = 0;
  for(var i = 0; i < renderer.setcola.links.length; ++i) {
    if((renderer.setcola.links[i].source._id == source._id && renderer.setcola.links[i].target._id == target._id)
    || (renderer.setcola.links[i].source._id == target._id && renderer.setcola.links[i].target._id == source._id)) {
      count++;
    }
  };
  return count;
};

var getSiblingLinks = function(source, target) {
  var siblings = [];
  for(var i = 0; i < renderer.setcola.links.length; ++i) {
    var found = false;
    if(renderer.setcola.links[i].source._id == source._id && renderer.setcola.links[i].target._id == target._id) found = true;
    else if(renderer.setcola.links[i].source._id == target._id && renderer.setcola.links[i].target._id == source._id) found = true;
    if(found) siblings.push(renderer.setcola.links[i]._id);
  }
  return siblings;
};

function arcPath(leftHand, d) {

  var padding = d.pad || 0;
  var x1 = leftHand ? d.source.x - d.source.pad : d.target.x - d.target.pad,
      y1 = leftHand ? d.source.y - d.source.pad : d.target.y - d.target.pad,
      x2 = leftHand ? d.target.x - d.target.pad : d.source.x - d.source.pad,
      y2 = leftHand ? d.target.y - d.target.pad : d.source.y - d.source.pad,
      dx = x2 - x1,
      dy = y2 - y1,
      dr = Math.sqrt(dx * dx + dy * dy),
      drx = dr,
      dry = dr,
      sweep = leftHand ? 0 : 1;
      siblingCount = countSiblingLinks(d.source, d.target),
      adjacentST = Math.abs(d.target.x - d.source.x + renderer.options['constgap'] + padding*2) <= renderer.options['constgap'] + padding*2,
      adjacentTS = Math.abs(d.source.x - d.target.x + renderer.options['constgap'] + padding*2) <= renderer.options['constgap'] + padding*2,
      xRotation = 0,
      largeArc = 0;

  // Check for self links
  if(dr === 0) {
    sweep = 0;
    xRotation = -90;
    largeArc = 1;
    drx = 12;
    dry = 12;
    x2 = x2 - 1; // Change the sign/magnitude of this offset to change where the self link is angled
    y2 = y2 - 1; // Change the sign/magnitude of this offset to change where the self link is angled
  }

  if(siblingCount === 1 && dr !== 0 && (adjacentTS || adjacentST)) {
    drx = 0;
    dry = 0;
  } else if(siblingCount > 1) {
    var siblings = getSiblingLinks(d.source, d.target);

    if(siblings.indexOf(d._id) === 0 && siblingCount < 4) drx = dry = 0;

    var arcScale = d3.scalePoint().domain(siblings).range([1, siblingCount]);
    drx = drx/(1 + (1/siblingCount) * (arcScale(d._id) - 1));
    dry = dry/(1 + (1/siblingCount) * (arcScale(d._id) - 1));
  }

  return 'M' + x1 + ',' + y1 + 'A' + drx + ', ' + dry + ' ' + xRotation + ', ' + largeArc + ', ' + sweep + ' ' + x2 + ',' + y2;
}

renderer.drawMultipleLinks = function() {

  renderer.links = renderer.svg.selectAll('.link')
      .data(renderer.setcola.links)
    .enter().append('path')
      .attr('class', function(d) {
        var className = 'link';
        if(d._temp) {
          if(renderer.options['layoutnode']) className += ' visible';
          if(!renderer.options['layoutnode']) className += ' hidden';
        }
        return className;
      })
      .attr('d', function(d) { return arcPath(true, d); })
      .style('stroke', function(d) { return '#aaa'; })
      .style('fill', 'transparent');

  if(renderer.options['arrows']) renderer.drawArrowheads();
  if(renderer.options['edgelabels']) renderer.drawLinkLabels();  
};

renderer.drawLinkLabels = function() {
  renderer.edgepaths = renderer.svg.selectAll('.edgepath')
      .data(renderer.setcola.links)
    .enter().append('path')
      .attr('d', function(d) { return arcPath(true, d); })
      .attr('class', 'edgepath')
      .attr('id', function(d,i) { return 'edgepath'+i; })
      .style('fill-opacity', 0)
      .style('stroke-opacity', 0)
      .style('fill', 'blue')
      .style('stroke', 'red')
      .style('pointer-events', 'none');

  renderer.edgelabels = renderer.svg.selectAll('.edgelabel')
      .data(renderer.setcola.links)
    .enter().append('text')
      .style('pointer-events', 'none')
      .attr('class', 'edgelabel')
      .attr('id', function(d,i){ return 'edgelabel'+i; })
      .attr('dy', -1)
      .style('font-size', 8)
      .style('fill', '#aaa');

  renderer.edgelabels.append('textPath')
      .attr('xlink:href', function(d,i) { return '#edgepath'+i; })
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text(function(d) {
        if(renderer.options['nodesize']) {
          if(d.label) return d.label;
        }
        return '';
      });
};

renderer.drawArrowheads = function() {
  renderer.svg.append('defs').selectAll('marker')
      .data(['arrowhead'])
    .enter().append('marker')
      .attr('id', function(d) { return d; })
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', function() { return renderer.options['nodesize'] + 10; })
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d', 'M0,-5L10,0L0,5 L10,0 L0, -5')
      .style('fill', function(d) { 
        if(d.color) return d.color;
        return '#aaa';
      })
      .style('stroke', function(d) { 
        if(d.color) return d.color;
        return '#aaa';
      });
  
  renderer.links
      .style('marker-end', function(d) {
        if(d._temp) return 'none';
        if(d.source._id === d.target._id) return 'none';
        return 'url(#' + 'arrowhead' + ')';
      })
      .style('fill', function(d) { 
        if(d.color) return d.color;
        return '#aaa';
      })
      .style('stroke', function(d) { 
        if(d.color) return d.color;
        return '#aaa';
      });
};

renderer.drawNodes = function() {
  renderer.nodes = renderer.svg.selectAll('.node')
      .data(renderer.setcola.nodes)
    .enter().append('g')
      .attr('class', function(d) {
        var className = 'node';
        if(!d._temp) className += ' basic';
        return className;
      })
    .call(renderer.colajs.drag);

  renderer.nodes.append('rect')
      .attr('class', function(d) {
        var className = 'node';
        if(d._temp) {
          className += (renderer.options['layoutnode']) ? ' visible' : ' hidden';
        }
        return className;
      })
      .attr('width', function(d) { 
        if(d._temp && renderer.options['layoutnode']) return 10;
        return d._width; 
      })
      .attr('height', function(d) { 
        if(d._temp && renderer.options['layoutnode']) return 10;
        return d._height; 
      })
      .attr('rx', function(d) {
        if(renderer.options['cornerradius'] == 'default') {
          return d.size ? d.size : renderer.options['nodesize'];
        }
        return renderer.options['cornerradius'];
      })
      .attr('ry', function(d) {
        if(renderer.options['cornerradius'] == 'default') {
          return d.size ? d.size : renderer.options['nodesize'];
        }
        return renderer.options['cornerradius'];
      })
      .style('fill', graph.nodeColor)
      .style('stroke', graph.nodeStroke);

  // Prevent interaction with nodes from causing pan on background
  renderer.nodes
    .on('click', renderer.opacity)
    .on('mousedown', function() { d3.event.stopPropagation(); })
    .on('mousemove', function() { d3.event.stopPropagation(); });

  renderer.nodes.append('title').text(graph.hoverLabel);

  if(renderer.options['showLabels']) {
    var nodes = renderer.nodes;
    if(!renderer.options['layoutnode']) {
      nodes = d3.selectAll('.basic');
    }
    var text = nodes.append('text').text(style.labelText);
    text.attr('class', 'text-label')
        .attr('dx', style.labeldx)
        .attr('dy', style.labeldy)
        .attr('filter', 'url(#solid)')
        .style('fill', style.labelColor)
        .style('opacity', 0.7)
        .style('font-size', style.labelSize)
        .style('font-style', style.labelStyle);
  } else if(renderer.options['showLabelsOnTop']) {
    renderer.textG = renderer.svg.selectAll('.text-label')
      .data(renderer.setcola.nodes)
    .enter().append('g')
      .attr('class', function(d) {
        var className = 'textNode';
        if(!d._temp) className += ' basic';
        return className;
      });
    var text = renderer.textG.append('text').text(style.labelText);
    text.attr('class', 'text-label')
        .attr('dx', style.labeldx)
        .attr('dy', style.labeldy)
        .attr('filter', 'url(#solid)')
        .style('fill', style.labelColor)
        .style('opacity', 0.7)
        .style('font-size', style.labelSize)
        .style('font-style', style.labelStyle);
  }
};

renderer.drawGroups = function() {
  renderer.groups = renderer.svg.selectAll('.group')
        .data(renderer.setcola.groups)
      .enter().append('rect')
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('class', 'group')
        .style('fill', style.groupFill)
        .style('opacity', function(d) {
          if(d.style === 'visible') return 0.85;
          return 0;
        })
      .call(renderer.colajs.drag);
};

renderer.tick = function() {

  // Update the links
  if(renderer.options['curved']) {
    renderer.links.attr('d', function(d) {
      if(d.source == d.target) return arcPath(true, d);
      return renderer.diagonal(d);
    });
  } else if(renderer.options['multiple']) {
    renderer.links.attr('d', function(d) { return arcPath(true, d); });
  } else {
    renderer.links
        .attr('x1', function (d) { return d.source.x - d.source.pad; })
        .attr('y1', function (d) { return d.source.y - d.source.pad; })
        .attr('x2', function (d) { return d.target.x - d.target.pad; })
        .attr('y2', function (d) { return d.target.y - d.target.pad; });
  }

  // Update the nodes
  renderer.nodes.attr('transform', function(d) { 
    if(d.fixed) {
      return 'translate(' + d.x + ',' + d.y + ')';
    } else {
      var x = d.x - d.width / 2;
      var y = d.y - d.height / 2;
      return 'translate(' + x + ',' + y + ')'; 
    }
  });

  // Update the labels
  if(renderer.options['showLabelsOnTop']) {
    renderer.textG.attr('transform', function(d) { 
      if(d.fixed) {
        return 'translate(' + d.x + ',' + d.y + ')';
      } else {
        var x = d.x - d.width / 2;
        var y = d.y - d.height / 2;
        return 'translate(' + x + ',' + y + ')'; 
      }
    });
  }

  if(renderer.options['edgelabels']) {

    renderer.edgepaths.attr('d', function(d) { return arcPath(true,d); });
    renderer.edgelabels.attr('transform', function(d,i){
      if(d.target.x < d.source.x){
        bbox = this.getBBox();
        rx = bbox.x+bbox.width/2;
        ry = bbox.y+bbox.height/2;
        return 'rotate(180 '+rx+' '+ry+')';
      } else {
        return 'rotate(0)';
      }
    });
  }

  // Update the boundaries
  if(renderer.options['layoutboundary']) renderer.showLayoutBoundaries();

  // Update the groups
  if(!renderer.groups) return;
  renderer.groups
      .attr('x', function (d) { return d.bounds.x; })
      .attr('y', function (d) { return d.bounds.y; })
      .attr('width', function (d) { return d.bounds.width(); })
      .attr('height', function (d) { return d.bounds.height(); });
};

function lock() {
  var nodes = renderer.setcola.nodes.map(function(node) {
    node.fixed = true;
    return node;
  });
  d3.select('.fa-lock').style('color', 'firebrick')
  renderer.colajs.nodes(nodes);
  renderer.colajs.constraints([]).start(0,0,0);
};

function zoomed(input) {
  var event = d3.event;
  if(input !== undefined) {
    renderer.zoom.translate(input.translate);
    renderer.zoom.scale(input.scale);
    event = input;
  }
  renderer.svg.attr('transform', 'translate(' + event.translate + ')scale(' + event.scale + ')');

  // Modify the visual boundaries
  var width = d3.select('svg').style('width').replace('px', '');
  var height = d3.select('svg').style('height').replace('px', '');
  var newWidth = width / event.scale;
  var newHeight = height / event.scale;
  var padding = 50;
  d3.selectAll('.boundary')
      .attr('x1', function(d) { return d.boundary === 'x' ? d.x : padding; })
      .attr('x2', function(d) { return d.boundary === 'x' ? d.x : newWidth-padding*2; })
      .attr('y1', function(d) { return d.boundary === 'y' ? d.y : padding; })
      .attr('y2', function(d) { return d.boundary === 'y' ? d.y : newHeight-padding*2; })
      .attr('transform', function(d) {
        var translate;
        if(d.boundary === 'x') {
          translate = event.translate[0] + ',0';
        } else {
          translate = '0,' + event.translate[1];
        }
        return 'translate(' + translate  + ')scale(' + event.scale + ')';
      });
  d3.selectAll('.boundary-text')
      .attr('transform', function(d) {
        var translate;
        if(d.boundary === 'x') {
          translate = event.translate[0] + ',0';
        } else {
          translate = '0,' + event.translate[1];
        }
        return 'translate(' + translate  + ')scale(' + event.scale + ')';
      })
      .style('font-size', function(d) { 
        return 12/event.scale + 'px';
      });
};

renderer.opacity = function(node) {
  d3.event.stopPropagation();
  if(node && node._temp) return;
  var neighbors = [];

  d3.selectAll('.link')
      .style('opacity', function(d) {
        if(!d) return 1; // Selected the background
        if(node && ((node._id != d.source._id && node._id != d.target._id) || d._temp)) {
          return 0.15;
        } else if(d3.select(this).attr('class').indexOf('hidden') != -1) {
          return 0;
        } else {
          if(neighbors.indexOf(d.source._id) == -1) neighbors.push(d.source._id);
          if(neighbors.indexOf(d.target._id) == -1) neighbors.push(d.target._id);
          return 1;
        }
      });

  d3.selectAll('.edgelabel')
      .style('opacity', function(d) {
        if(node && ((node._id != d.source._id && node._id != d.target._id) || d._temp)) {
          return 0.15;
        } else if(d3.select(this).attr('class').indexOf('hidden') != -1) {
          return 0;
        } else {
          if(neighbors.indexOf(d.source._id) == -1) neighbors.push(d.source._id);
          if(neighbors.indexOf(d.target._id) == -1) neighbors.push(d.target._id);
          return 1;
        }
      })

  d3.selectAll('.node')
      .style('opacity', function(d) {
        if(node && neighbors.indexOf(d._id) == -1) {
          return 0.15;
        } else if(d3.select(this).attr('class').indexOf('hidden') != -1) {
          return 0;
        } else {
          return 1;
        }
      });

  if(!node) return;

  var relatedConstraints = renderer.setcola.constraints.filter(function(constraint) {
    var isRelated = false;
    if(constraint.right == node._id) isRelated = true;
    if(constraint.left == node._id) isRelated = true; 
    if(constraint.offsets && constraint.offsets.map(function(n) { return n.node; }).indexOf(node._id) !== -1) isRelated = true;
    return isRelated;
  });
  console.log('Node ' + node._id + ' is: ', node, ' and is involved in these constraints: ', relatedConstraints);
};

renderer.highlight = function(nodes) {
  if(renderer.options['debugprint']) console.log('  Highlighting: ', nodes);
  var ids = nodes.map(function(n) { return n._id; });
  d3.selectAll('.node')
      .filter(function(node) { return ids.indexOf(node._id) != -1; })
      .style('fill', 'firebrick')
      .style('stroke', 'red')
      .style('stroke-width', 3);
};

renderer.removeHighlight = function(nodes) {
  d3.selectAll('.node')
      .filter(function(node) { return node._temp == null; })
      .style('fill', graph.nodeColor)
      .style('stroke', graph.nodeStroke)
      .style('stroke-width', 1);
};

renderer.showError = function() {
  var color = d3.scaleSequential(d3.interpolateYlOrRd);
  renderer.nodes.selectAll('rect').style('fill', function(d) { 
        var err = validator.errors[d._id] / validator.maxError || 0;
        return color(err); 
      })
    .on('click', function(d) {
      var invalid = validator.getInvalidConstraints(d);
      console.log('Node ' + d._id + ' has ' + validator.errors[d._id] + ' invalid constraints: ', invalid);
    });
};

renderer.showLayoutBoundaries = function() {
  var boundaries = renderer.setcola.nodes.filter(function(node) { return node.boundary; });
  if(boundaries.length === 0) return;

  // Process the boundaries to split the x and y.
  for (var i = 0; i < boundaries.length; i++) {
    if(boundaries[i].boundary === 'xy') {
      var duplicate = Object.assign({}, boundaries[i]);
      boundaries[i].boundary = 'x';
      duplicate.boundary = 'y';
      boundaries.push(duplicate);
    }
  };

  // Draw the boundaries.
  var width = d3.select('svg').style('width').replace('px', ''),
      height = d3.select('svg').style('height').replace('px', '');
  var padding = 50;
  var boundary_line = d3.select('.graph').selectAll('.boundary')
      .data(boundaries)
      .attr('x1', function(d) {
        return d.boundary === 'x' ? d.x : padding;
      })
      .attr('x2', function(d) {
        return d.boundary === 'x' ? d.x : width-padding*2;
      })
      .attr('y1', function(d) {
        return d.boundary === 'y' ? d.y : padding;
      })
      .attr('y2', function(d) {
        return d.boundary === 'y' ? d.y : height-padding*2;
      });
  
  boundary_line.enter().append('line').attr('class', 'boundary');

  var boundary_text = d3.select('.graph').selectAll('.boundary-text')
      .data(boundaries)
      .attr('x', function(d) { return position = d.boundary === 'x' ? d.x + 10 : padding; })
      .attr('y', function(d) { return position = d.boundary === 'y' ? d.y - 10 : padding + 10; });
  
  boundary_text.enter().append('text')
      .attr('class', 'boundary-text')
      .text(function(d) { 
        var string = d.name || d.temp_name;
        if(!string && d._type) string = d._type + ' position ' + Math.round(d[d.boundary]);
        if(!string) string = 'position ~' + Math.round(d[d.boundary]);
        return string;
      });
};

renderer.centerGraph = function() {
  var averagePos = averageNodePosition();
  var rect = document.getElementById('zoomr').getBoundingClientRect();
  var x = rect.width / 2 - averagePos.x;
  var y = rect.height / 2 - averagePos.y;
  zoomed({'translate': [x,y], 'scale': 1});
};

function averageNodePosition() {
  var sumX = 0;
  var sumY = 0;
  for (var i = 0; i < renderer.setcola.nodes.length; i++) {
    sumX += renderer.setcola.nodes[i].x;
    sumY += renderer.setcola.nodes[i].y;
  }
  averageX = sumX/renderer.setcola.nodes.length;
  averageY = sumY/renderer.setcola.nodes.length;
  return {'x': averageX, 'y': averageY};
};

/***************************************************************/
/******************** DEFAULT GRAPH OPTIONS ********************/
/***************************************************************/

renderer.defaultOptions = function(layout) {
  var type = layout.nodes[renderer.options['fillprop']];
  renderer.color = (typeof type == 'string') ? d3.scaleOrdinal(d3.schemeDark2) : d3.scaleSequential(d3.interpolateYlGnBu);

  layout.nodes.forEach(function(node) {
    node._width = node.width || node.size || renderer.options['nodesize'];
    node._height = node.height || node.size || renderer.options['nodesize'];
    node.pad = node.pad || renderer.options['nodepad'];
    node.width = node._width + 2*node.pad;
    node.height = node._height + 2*node.pad;
  });
};