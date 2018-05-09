var timing = {};
var editor = {};

/**********************************************************************/
/*************************** SetCoLa Editor ***************************/
/**********************************************************************/

editor.init = function() {
  d3.text('app/template.html', function(err, text) { 

    d3.select('body').html(text); 

    // Start up the inspector and renderer
    inspector.init();
    validator.init();
    renderer.init();
    editor.ace();

    // Set up interactions in environment
    d3.select('#submit').on('click', editor.start);
    d3.select('.separator').on('click', editor.visibility);
    d3.select('.fa.fa-play').on('click', editor.restart);
    d3.select('.fa.fa-exclamation-circle').on('click', inspector.showError);
    d3.select('.fa.fa-gear').on('click', inspector.showConfig);
    d3.select('.fa.fa-bug').on('click', inspector.showDebug);
    d3.select('.fa.fa-quote-right').on('click', inspector.showCite);
    d3.select('.fa.fa-question-circle').on('click', inspector.showHelp);

    // Load the example specs
    var exampleSel = d3.select('.sel_examples');
    exampleSel.on('change', editor.load);
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
      .on('mouseup', function() {
        d3.event.stopPropagation();
        renderer.removeHighlight();
        var selection = editor.ace.getSelectedText();
        highlightNodeInSelection(selection);
      });

    d3.selectAll('.specs .cola-spec')
      .on('mouseup', function() {
        d3.event.stopPropagation();
        renderer.removeHighlight();
        var selection = editor.colaEditor.getSelectedText();
        highlightNodeInSelection(selection);
      });

    // Load the graph
    editor.load();

  });
};

editor.start = function() {
  if(renderer.options['debugprint']) console.log('Starting layout...');

  // Load the graph from the editor.
  try {
    editor.error = null;
    if(inspector.errorVisible) inspector.showError();
    editor.spec = JSON.parse(editor.ace.getValue());
    if(renderer.options['edgeref'] !== '_id' && renderer.options['edgeref'] !== '') {
      editor.spec = resolveGraphEdges(editor.spec, renderer.options['edgeref']);
    }
    if(editor.spec.links && typeof editor.spec.links[0].source !== 'number') {
      var error = 'Links probably do not use node \'_id\' for the source/target. Provide an \'Edge Reference Property\' in the config options to continue.';
      console.error(error);
      editor.error = error;
      inspector.showError();
      return;
    }
  } catch (error) {
    editor.error = error;
    inspector.showError();
    console.error(error);
    return;
  }

  // Figure out the constraints for the graph layout.
  if(editor.isUserConstraintGraph()) {
    try {
      var graph = {'nodes': editor.spec.nodes, 'links': editor.spec.links};
      var t0 = performance.now();
      var layout = setcola
          .nodes(editor.spec.nodes)
          .links(editor.spec.links)
          .guides(editor.spec.guides || [])
          .constraints(editor.spec.constraintDefinitions)
          .gap(renderer.options['constgap'])
          .layout();
      var t1 = performance.now();
      timing.setcola = formatTime(t1 - t0);
      editor.draw(layout);
    } catch(error) {
      editor.error = error;
      inspector.showError();
      console.error(error);
    }
  }
};

editor.draw = function(layout) {
  editor.colaEditor.setValue(prettyJSON(layout));
  editor.colaEditor.session.selection.clearSelection();
  editor.layout = layout;

  d3.select('.status').transition().duration(200)
      .style('opacity', 1)
      .each(function() {
        var time = d3.timer(function(elapsed) {
          if(elapsed > 300) {
            time.stop();
            var t0 = performance.now();
            renderer.draw(layout);
            var t1 = performance.now();
            timing.webcola = formatTime(t1 - t0);
            console.log('Rendering \'' + editor.example + '\' took ' + formatTime(t1 - t0) + '.');
            d3.select('.status').transition().style('opacity', 0);

            if(inspector.debugVisible) {
              inspector.debugVisible = false;
              inspector.showDebug();
              inspector.toggleValidation();
              inspector.toggleValidation();
            }
          }
        });
      });
};

editor.restart = function() {
  if(editor.layout) renderer.draw(editor.layout);
};

editor.load = function() {
  var exampleSel = document.getElementsByClassName('sel_examples')[0];
  var example = exampleSel.options[exampleSel.selectedIndex].value;
  var type = exampleSel.options[exampleSel.selectedIndex].parentNode.label;
  var typeStr =  (type + '').toLowerCase()
  var PATH = 'app/specs/' + (type ?  typeStr + '-examples/' : '') + example + '.json';
  editor.example = example;

  renderer.setStyle(example);

  d3.text(PATH, function(spec) {
    editor.ace.setValue(spec);
    editor.ace.session.selection.clearSelection();
    editor.start();
  });
};

editor.visibility = function() {
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

editor.isUserConstraintGraph = function() {
  return editor.spec.constraintDefinitions;
};

editor.ace = function() {
  ace.require('ace/ext/language_tools');
  editor.ace = ace.edit('editor');
  editor.ace.getSession().setMode('ace/mode/json');
  editor.ace.$blockScrolling = Infinity;

  editor.ace.setOptions({
    tabSize: 2,
    enableBasicAutocompletion: true,
    enableSnippets: false,
    enableLiveAutocompletion: true
  });

  editor.colaEditor = ace.edit('cola-editor');
  editor.colaEditor.getSession().setMode('ace/mode/json');
  editor.colaEditor.$blockScrolling = Infinity
  editor.colaEditor.setOptions({tabSize: 2});
};

function highlightNodeInSelection(selection) {
  var found = selection.match(/("source":\s*?\d+|"target":\s*?\d+|"_id":\s*?\d+|"left":\s*?\d+|"right":\s*?\d+|"node":\s*?\d+)/g) || [];
  var nodes = found.map(function(value) {
    return {'_id': Number(value.replace(/[^\d]+/g, ''))};
  });
  renderer.highlight(nodes);
};

function resolveGraphEdges(spec, property) {
  spec.links.forEach(function(link) {
    var source = spec.nodes.filter(function(node) { return node[property] == link.source; })[0];
    var target = spec.nodes.filter(function(node) { return node[property] == link.target; })[0];
    link.source = spec.nodes.indexOf(source);
    link.target = spec.nodes.indexOf(target);
  });
  return spec;
};

/*************************** Format Output ****************************/

function formatTime(time) {
  var date = new Date(time);
  var ms = date.getMilliseconds();
  var s = date.getSeconds();
  var min = date.getMinutes();
  if(min > 0) {
    return min + ':' + s + '.' + ms + ' minutes';
  } else if(s > 0) {
    return s + '.' + ms + ' seconds';
  } else {
    return ms + ' milliseconds';
  }
};

function prettyJSON(spec) {
  spec = {
    'nodes': spec.nodes,
    'links': spec.links,
    'groups': spec.groups,
    'constraints': spec.constraints
  };

  spec.nodes.forEach(function(node) {
    if(node.parent) node.parent = spec.nodes.indexOf(node.parent);
    if(node.firstchild) node.firstchild = spec.nodes.indexOf(node.firstchild);
  });
  return complexPrint(spec);
}

function complexPrint(object, indent) {
  if(!indent) indent = '';
  var string = JSON.stringify(object);
  if(string.length > 80) {
    string = '{';
    var keys = Object.keys(object);
    indent = indent + '  ';
    for (var i = 0; i < keys.length; i++) {
      if(typeof object[keys[i]] === 'undefined') break;
      if(typeof object[keys[i]] === 'function') break;
      string += '\n' + indent + '"' + keys[i] + '": ';
      if(object[keys[i]] instanceof Array) {
        string += printList(object[keys[i]], indent+'  ');
      } else if(typeof object[keys[i]] === 'object') {
        string += complexPrint(object, indent);
      } else {
        string += JSON.stringify(object[keys[i]]);
      }
      string += ',';
    };
    if(string[string.length-1] === ',') string = string.slice(0,string.length-1);
    string += '\n' + indent.replace('  ', '') + '}';
  }
  return string;
};

function printList(list, indent) {
  if(typeof list[0] === 'object') {
    var string = '[\n';
    listString = '';
    for (var i = 0; i < list.length; i++) {
      listString += indent + complexPrint(list[i], indent);
      if(i < list.length - 1) listString += ',\n';
    }
    string += listString;
    string += '\n' + indent.replace('  ', '') + ']';
    return string;
  } else {
    return JSON.stringify(list);
  }
};