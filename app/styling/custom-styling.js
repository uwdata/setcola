/*****************************************************/
/********************** Generic **********************/
/*****************************************************/
var graph = {};

  graph.nodeColor = function(d) {
    var fillprop = renderer.options['fillprop'];
    var value = d[fillprop] || 0.5;
    if(fillprop === 'color') {
      // Don't change the color
    } else if(typeof value == 'number') {
      var max = Math.max(...renderer.setcola.nodes.map(function(n) { return n[fillprop] || 0.5; }));
      d.color = renderer.color(value / max);
    } else {
      d.color = renderer.color(value);
    }
    return d.color;
  };

  graph.hoverLabel = function(node) {
    return node[renderer.options['labelprop']] || node.name || node._id;
  };

  graph.nodeStroke = function(node) {
    var value = 'white';
    if(node.guide) return node.stroke || '#f6c5c5';
    if(node.temp) return node.stroke || '#ddd';
    return node.stroke || style.nodeStroke(node) || value;
  };

/*****************************************************/
/********************** Default **********************/
/*****************************************************/
var styling = {};

  styling.labeldx = function(d) { 
    return d.width/2 - 7;
  };

  styling.labeldy = function(d) { 
    return d.width/2 + 4;
  };

  styling.labelText = function(d) {
    return d.name;
  };

  styling.labelSize = function(d) {
    return '12pt';
  };

  styling.labelStyle = function(d) {
    return 'italic';
  };

  styling.labelColor = function(d) {
    return 'white';
  };

  styling.nodeStroke = function(d) {
    return 'white';
  };

  styling.options = {
    'edgeref': '',
    'noconst': 50,
    'userconst': 100,
    'layoutconst': 200,
    'linkdist': 115,
    'jaccard': 0,
    'symmetric': 0,
    'constgap': 40,
    'nodesize': 14,
    'nodepad': 0,
    'debugprint': false,
    'layoutnode': false,
    'layoutboundary': false,
    'overlaps': true,
    'arrows': false,
    'curved': false,
    'multiple': false,
    'edgelabels': false,
    'fillprop': 'color',
    'showLabels': false,
    'showLabelsOnTop': false,
    'cornerradius': 'default'
  };

/*****************************************************/
/****************** Small Food Web *******************/
/*****************************************************/
var kruger = {};

  kruger.labeldx = function(d) { 
    var pad = d.pad || renderer.options['nodepad'];
    var nodeWidth = d.width - 2*pad;
    var offset = this.getBBox().width/2;

    return nodeWidth/2 - offset;
  };

  kruger.labeldy = function(d) { 
    var pad = d.pad || renderer.options['nodepad'];
    return (d.height - 2*pad)/2;
  };

  kruger.labelText = function(d) {
    return d.name;
  };

  kruger.labelSize = function(d) {
    return '5pt';
  };

  kruger.labelStyle = function(d) {
    return 'regular';
  };

  kruger.labelColor = function(d) {
    return 'black';
  };

  kruger.nodeStroke = function(d) {
    return 'white';
  };

  kruger.options = {
    'nodesize': 30,
    'arrows': true,
    'cornerradius': 30
  };

/*****************************************************/
/********************* Serengeti *********************/
/*****************************************************/
var serengeti = {};

  serengeti.labeldx = function(d) { 
    if(d.group1 <= 6) return d.size + 1;
    return d.size/2 - 5;labelS  };

  serengeti.labeldy = function(d) { 
    if(d.group1 <= 6) return d.size/2 + 7; 
    return d.size/2 + 5;
  };

  serengeti.labelText = function(d) {
    var string = ''
    if(!d.species) {
      // Do nothing.
    } else if(d.group1 <= 6) {
      var split = d.species.split(' ');
      string = split[0].slice(0,1) + '. ' + split[1];
    } else {
      // Do nothing.
    }
    
    return string;
  };

  serengeti.labelSize = function(d) {
    if(d.group1 <= 6) return '14pt';
    return '10pt';
  };

  serengeti.labelStyle = function(d) {
    if(d.group1 <= 6) return 'italic';
    return 'normal';
  };

  serengeti.labelColor = function(d) {
    return 'black';
  };

  serengeti.nodeStroke = function(d) {
    return 'white';
  };

  serengeti.options = {
    'showLabels': true
  };

/*****************************************************/
/********************* Syphilis **********************/
/*****************************************************/
var syphilis = {};

  syphilis.labeldx = function(d) { 
    var offset = 11;
    if(d._width === 24) offset = 7;
    return d._width/2 - offset;
  };

  syphilis.labeldy = function(d) { 
    var pad = d.pad || renderer.options['nodepad'];
    return d._height/2 + 5;
  };

  syphilis.labelText = function(d) {
    return d.name;
  };

  syphilis.labelSize = function(d) {
    return '9pt';
  };

  syphilis.labelStyle = function(d) {
    return 'regular';
  };

  syphilis.labelColor = function(d) {
    return 'black';
  };

  syphilis.nodeStroke = function(d) {
    return 'white';
  };

  syphilis.options = {
    'showLabels': true,
    'cornerradius': 0
  };

/*****************************************************/
/*********************** TLR4 ************************/
/*****************************************************/
var tlr4 = {};

  tlr4.labeldx = function(d) { 
    var offset = this.getBBox().width/2 -4;
    var pad = d.pad || renderer.options['nodepad'];
    return (d.width - 2*pad)/2 - offset;
  };

  tlr4.labeldy = function(d) { 
    return 35;
  };

  tlr4.labelText = function(d) {
    return d.showLabel;
  };

  tlr4.labelSize = function(d) {
    return '9pt';
  };

  tlr4.labelStyle = function(d) {
    return 'regular';
  };

  tlr4.labelColor = function(d) {
    return 'black';
  };

  tlr4.nodeStroke = function(d) {
    return '#bbb';
  };

  tlr4.groupFill = function(d) { 
    return '#D6F6CC'; 
  };

  tlr4.options = {
    'linkdist': 350,
    'constgap': 100,
    'curved': true,
    'showLabelsOnTop': true
  };

/*****************************************************/
/******************** INNATE DB **********************/
/*****************************************************/
var innatedb = {};

  innatedb.labeldx = function(d) { 
    var offset = this.getBBox().width/2 -4;
    var pad = d.pad || renderer.options['nodepad'];
    return (d.width - 2*pad)/2 - offset;
  };

  innatedb.labeldy = function(d) { 
    return 35;
  };

  innatedb.labelText = function(d) {
    if(d.showLabel) return d['-label'];
    return '';
  };

  innatedb.labelSize = function(d) {
    return '11pt';
  };

  innatedb.labelStyle = function(d) {
    return 'regular';
  };

  innatedb.labelColor = function(d) {
    return 'black';
  };

  innatedb.nodeStroke = function(d) {
    return '#bbb';
  };

  innatedb.options = {
    'edgeref': 'id',
    'linkdist': 225,
    'constgap': 100,
    'curved': true,
    'showLabelsOnTop': true
  };