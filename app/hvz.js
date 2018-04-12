var hvz = {};
var timing = {};

/***************************************************************/
/*********************** HVZ ENVIRONMENT ***********************/
/***************************************************************/

hvz.init = function() {

  d3.text('app/template.html', function(err, text) { 

    d3.select('body').html(text); 

    // Start up the inspector and renderer
    inspector.init();
    validator.init();
    renderer.init();
    hvz.ace();

    // Set up interactions in environment
    d3.select('#submit').on('click', hvz.start);
    d3.select('.separator').on('click', hvz.visibility);
    d3.select('.fa.fa-play').on('click', hvz.restart);
    d3.select('.fa.fa-exclamation-circle').on('click', inspector.showError);
    d3.select('.fa.fa-gear').on('click', inspector.showConfig);
    d3.select('.fa.fa-bug').on('click', inspector.showDebug);
    d3.select('.fa.fa-quote-right').on('click', inspector.showCite);
    d3.select('.fa.fa-question-circle').on('click', inspector.showHelp);

    var exampleSel = d3.select('.sel_examples');
    exampleSel.on('change', hvz.load);
    exampleSel.append('option').text('custom');
    exampleSel.selectAll('optgroup')
        .data(Object.keys(EXAMPLES))
      .enter().append('optgroup')
        .attr('label', function(key) { return key; })
      .selectAll('option.spec')
        .data(function(key) { return EXAMPLES[key]; })
      .enter().append('option')
        .text(function(d) { return d.name; });

    d3.selectAll('.specs .spec')
      .on('click', function() {
        d3.event.stopPropagation();
        renderer.removeHighlight();
        var selection = document.getSelection().toString();
        highlightNodeInSelection(selection);
      });

    // Load the graph
    hvz.load();

  });

};

hvz.start = function() {
  if(renderer.options['debugprint']) console.log('Starting layout...');

  d3.select('#status').html('Rendering...');

  // Load the graph from the editor.
  try {
    hvz.error = null;
    if(inspector.errorVisible) inspector.showError();
    var spec = JSON.parse(hvz.editor.getValue());

    var t0 = performance.now();
    graph.init(spec);
    var t1 = performance.now();
    timing.init = t1 - t0;
  } catch (error) {
    hvz.error = error;
    inspector.showError();
    console.error(error);
    return;
  }

  // Figure out the constraints for the graph layout.
  if(hvz.isUserConstraintGraph()) {
    try {
      graph.user_constraints = graph.spec.sets;
      var t0 = performance.now();
      var result = layout.getConstraints();
      var t1 = performance.now();
      timing.setcola = (t1 - t0) + ' ms.';
      graph.spec.constraints = result.constraints;
      graph.spec.groups = (graph.spec.groups || []).concat(result.groups);
    } catch(error) {
      inspector.showError(error);
      console.error(error);
    }
  }

  hvz.colaEditor.setValue(prettyJSON());
  hvz.colaEditor.session.selection.clearSelection();

  // Draw the graph
  var t0 = performance.now();
  renderer.draw();
  var t1 = performance.now();
  timing.webcola = t1 - t0 + ' ms.';
  console.log('Rendering took ' + (t1 - t0) + ' ms.');

  if(inspector.debugVisible) {
    inspector.debugVisible = false;
    inspector.showDebug();
    inspector.toggleValidation();
    inspector.toggleValidation();
  }
};

hvz.restart = function() {
  if(graph.spec && graph.spec.nodes) renderer.draw();
};

hvz.load = function() {
  var exampleSel = document.getElementsByClassName('sel_examples')[0];
  var example = exampleSel.options[exampleSel.selectedIndex].value;
  var type = exampleSel.options[exampleSel.selectedIndex].parentNode.label;
  var typeStr =  (type + '').toLowerCase()
  var PATH = 'app/specs/' + (type ?  typeStr + '-examples/' : '') + example + '.json';

  renderer.setStyle(example);

  d3.text(PATH, function(spec) {
    graph.spec = spec;
    hvz.editor.setValue(graph.spec);
    hvz.editor.session.selection.clearSelection();
    hvz.start();
  });
};

hvz.visibility = function() {
  var current = d3.select(this).attr('class');
  if(current.indexOf('down') !== -1) {
    d3.select(this)
        .attr('class', current.replace('down', 'up'))
      .select('span')
        .attr('class', 'fa fa-angle-double-up');
    d3.select('.cola-spec').style('display', 'none');
  } else {
    d3.select(this)
        .attr('class', current.replace('up', 'down'))
      .select('span')
        .attr('class', 'fa fa-angle-double-down');
    d3.select('.cola-spec').style('display', 'flex');
  }
};

hvz.isUserConstraintGraph = function() {
  return graph.spec.constraintDefinitions;
};

hvz.ace = function() {
  ace.require('ace/ext/language_tools');
  hvz.editor = ace.edit('editor');
  hvz.editor.getSession().setMode('ace/mode/json');
  hvz.editor.$blockScrolling = Infinity;

  hvz.editor.setOptions({
    tabSize: 2,
    enableBasicAutocompletion: true,
    enableSnippets: false,
    enableLiveAutocompletion: true
  });

  hvz.colaEditor = ace.edit('cola-editor');
  hvz.colaEditor.getSession().setMode('ace/mode/json');
  hvz.colaEditor.$blockScrolling = Infinity;
};

function highlightNodeInSelection(selection) {
  var found = selection.match(/('source':\d+|'target':\d+|'_id':\d+|'left':\d+|'right':\d+)/g) || [];
  var nodes = found.map(function(value) {
    return {'_id': Number(value.replace(/[^\d]+/g, ''))};
  });
  renderer.highlight(nodes);
};

function prettyJSON() {
  var simplified = graph.spec;
  simplified.nodes.forEach(function(node) {
    if(node.parent) node.parent = graph.spec.nodes.indexOf(node.parent);
    if(node.firstchild) node.firstchild = graph.spec.nodes.indexOf(node.firstchild);
  });

  var spec = JSON.stringify(simplified, null, 2);
  return spec;
};

/*************************** Helpers ***************************/

function contains(list, element) {
  return list.indexOf(element) !== -1;
};
