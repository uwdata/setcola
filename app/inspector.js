var inspector = {};

/***************************************************************/
/************************** INSPECTOR **************************/
/***************************************************************/

inspector.init = function() {
  inspector.errorVisible = false;
  inspector.configVisible = false;
  inspector.debugVisible = false;
  inspector.citeVisible = false;
  inspector.helpVisible = false;
};

function clearInspector(mode) {
  // Clear the config state
  if(mode != 'error') {
    inspector.errorVisible = false;
    d3.select('.fa.fa-exclamation-circle').style('color', 'white');
  }
  if(mode != 'config') {
    inspector.configVisible = false;
    d3.select('.fa.fa-gear').style('color', 'white');
  }
  if(mode != 'debug') {
    inspector.debugVisible = false;
    d3.select('.fa.fa-bug').style('color', 'white');
    d3.selectAll('.legend').remove();
  }
  if(mode != 'cite') {
    inspector.citeVisible = false;
    d3.select('.fa.fa-quote-right').style('color', 'white');
  }
  if(mode != 'help') {
    inspector.helpVisible = false;
    d3.select('.fa.fa-question-circle').style('color', 'white');
  }
};

/***************************************************************/
/************************** Error Pane *************************/
/***************************************************************/

inspector.showError = function() {
  clearInspector('error');

  inspector.errorVisible = editor.error ? true : !inspector.errorVisible;
  if(inspector.errorVisible) {
    d3.select('.fa.fa-exclamation-circle').style('color', '#c80101');
    var div = d3.select('.temp-region')
        .attr('class', 'temp-region error')
        .style('display', 'flex');
    if(editor.error) {
      div.select('.error-string').html(editor.error);
      div.select('.error p').style('display', 'block');
    } else {
      div.select('.error-string').html('');
      div.select('.error p').style('display', 'none');
    }
    
    createErrorContents();
  } else {
    d3.select('.fa.fa-exclamation-circle').style('color', 'white');
    d3.select('.temp-region').style('display', 'none');
  }
};

function createErrorContents() {
  var div = d3.select('.temp-region .error');
  d3.select('#time-setcola').html(timing.setcola);
  d3.select('#time-webcola').html(timing.webcola);
};

/***************************************************************/
/************************** Config Pane ************************/
/***************************************************************/

inspector.showConfig = function() {
  clearInspector('config');

  inspector.configVisible = !inspector.configVisible;
  if(inspector.configVisible) {
    d3.select('.fa.fa-gear').style('color', '#01adc8');
    var div = d3.select('.temp-region')
        .attr('class', 'temp-region config')
        .style('display', 'flex');
  } else {
    d3.select('.fa.fa-gear').style('color', 'white');
    d3.select('.temp-region').style('display', 'none');
  }
};

/******************** Update Config Options ********************/

function updateRange(type) {
  var value = document.getElementById('range-' + type).value;
  renderer.options[type] = Number(value);
  d3.select('#value-' + type).html(value);
};

function updateCheck(type) {
  renderer.options[type] = document.getElementById('check-' + type).checked;
};

function updateText(type) {
  renderer.options[type] = document.getElementById('text-' + type).value;
};

/***************************************************************/
/************************** Debug Pane *************************/
/***************************************************************/

inspector.showDebug = function() {
  clearInspector('debug');

  inspector.debugVisible = !inspector.debugVisible;
  if(inspector.debugVisible) {
    d3.select('.fa.fa-bug').style('color', '#efad0c');
    d3.select('.temp-region')
        .attr('class', 'temp-region debug')
        .style('display', 'flex');
    d3.selectAll('.temp-region .debug .const').remove();
    createDebugContents();
  } else {
    d3.select('.fa.fa-bug').style('color', 'white');
    d3.select('.temp-region').style('display', 'none');
  }
};

function createDebugContents() {
  var constraints = Object.keys(setcola.sets()) || [];
  var div = d3.select('.temp-region .debugcontents');
  var group = div.selectAll('.const')
      .data(constraints)
    .enter().append('div')
      .attr('class', 'const');

  // ----------------------------------------------
  // Draw a header for each user defined constraint
  // ----------------------------------------------

  group.append('span').text('Constraint Definition: ')
      .style('font-size', '18px');
  group.append('span')
      .text(function(d) { return d; })
      .attr('class', 'name');
  group.append('span')
      .attr('class', 'fa fa-caret-down')
    .on('click', changeConstraintVisibility);

  // ----------------------------------------------
  // Show information about the created sets
  // ----------------------------------------------

  var contents = group.append('div')
      .attr('class', 'contents')
      .attr('id', function(d) { return constraintElementID(d) + '_contents'; });

  var header = contents.append('div');
  header.append('span').html(getNumSetsString);

  header.append('span')
      .attr('class', 'fa fa-caret-right')
    .on('click', changeSetVisibility);

  // ----------------------------------------------
  // Add a label for each created set
  // ----------------------------------------------

  var select = contents.append('div')
      .attr('class', 'selects')
      .attr('id', function(d) { return constraintElementID(d) + '_sets'; })
      .style('display', 'none');

  var g = select.selectAll('check')
      .data(function(d) { return setcola.sets()[d]; })
    .enter().append('g')
      .attr('class', 'check')
      .style('display', 'inline-block');

  g.append('span')
      .text(function(d,i) { return d._setName ? d._setName : i; })
      .style('margin', '0px 3px')
    .on('mouseover', function(set) {
      var nodes = getEnclosedNodes(set);
      renderer.highlight(nodes);
    })
    .on('mouseout', renderer.removeHighlight);

  // ----------------------------------------------
  // Show information about the sub constraints
  // ----------------------------------------------

  header = contents.append('div');
  header.append('span').html(getSubConstraintsString);
  header.append('span')
      .attr('class', function(d) {
        var constraints = renderer.setcola.constraintDefs.filter(function(c) { return c.name == d; })[0].forEach;
        if(!constraints) return '';
        return 'fa fa-caret-down';
      })
    .on('click', changeSubConstraintVisibility);

  // ----------------------------------------------
  // Add information and selection for each const.
  // ----------------------------------------------

  var select = contents.append('div')
      .attr('class', 'selects')
      .attr('id', function(d) { return constraintElementID(d) + '_constraints'; });

  var g = select.selectAll('check')
      .data(getSubConstraints)
    .enter().append('g')
      .attr('class', 'check')
      .style('display', 'block');

  g.append('input').attr('type', 'checkbox')
      .html(function(d) { return d; })
      .attr('checked', 'true')
    .on('change', changeAppliedConstraints);

  g.append('span').text(function(d) { return d + ': '; });

  g.append('span')
      .html(getSubConstraintsCountString)
      .style('font-style', 'italic');

  // ----------------------------------------------
  // Add a search box for finding nodes
  // ----------------------------------------------

  div.append('br');
  var group = div.append('div').attr('class', 'const');
  group.append('span').text('Search for node _id: ')
      .style('font-size', '18px')
      .attr('class', 'name');
  group.append('input')
      .attr('type', 'text')
      .on('input', function(d) {
        var ids = this.value.replace(' ', '').split(',').filter(function(val) { return val != ''; });
        var nodes = ids.map(function(val) { return {'_id': Number(val)}; });
        d3.selectAll('.node').style('stroke-width', 0);
        renderer.highlight(nodes);
      });
};

/********************** Get Debug Contents  ********************/

function constraintElementID(d) {
  return d.replace(/ /g, '');
};

function getNumSetsString(d) {
  var number = setcola.sets()[d].length;
  number = '<span class=\'number\'>' + number + '</span>';
  return 'Created ' + number + ' sets of nodes';
};

function getSubConstraints(d) {
  var constraints = renderer.setcola.constraintDefs.filter(function(c) { return c.name == d; })[0].forEach || [];
  if(!constraints) return [];
  return constraints.map(function(c) { return c.constraint; }); 
};

function getSubConstraintsString(d) {
  var constraints = renderer.setcola.constraintDefs.filter(function(c) { return c.name == d; })[0].forEach || [];
  if(!constraints) constraints = [];

  var number = '<span class=\'number\'>' + constraints.length + '</span>';  
  var are = constraints.length == 1 ? ' is ' : ' are ';
  var s = constraints.length == 1 ? ' constraint ' : ' constraints ';

  return 'There' + are + number + s + 'defined over these sets';
};

function getSubConstraintsCountString(typeName) {
  var constraintName = d3.select(this.parentNode.parentNode).datum();
  var constraints = renderer.setcola.constraints.filter(function(c) { 
    return c._type ==  constraintName + '_' + typeName; 
  });
  number = '<span class=\'number\'>' + constraints.length + '</span>';
    
  var s = constraints.length == 1 ? ' constraint' : ' constraints';

  var string = 'This constraint creates ' + number + ' cola.js' + s + '.';

  if(validator.errors) {
    var constraintName = d3.select(this.parentNode.parentNode).datum();
    var constraints = renderer.setcola.constraints.filter(function(c) { 
      return c._type ==  constraintName + '_' + typeName && c.unsat; 
    });
    number = '<span class=\'number\' style=\'color: #b86fdc\'>' + constraints.length + '</span>';
    
    if(constraints.length == 0) {
      // DO NOTHING.
    } else if(constraints.length == 1) {
      string += ' <span class=\'number\' style=\'color: #b86fdc\'>One</span> of these constraints is unsatisfied.'
    } else {
      string += ' ' + number + ' of these constraints are unsatisfied.';
    }
  }

  return string;
};

/********************** Debug Interactions *********************/

function changeConstraintVisibility(d) {
  var className = d3.select(this).attr('class');
  if(className == 'fa fa-caret-right') {
    d3.select(this).attr('class', 'fa fa-caret-down');
    d3.select('#' + constraintElementID(d) + '_contents').style('display', 'inherit');
  } else {
    d3.select(this).attr('class', 'fa fa-caret-right');
    d3.select('#' + constraintElementID(d) + '_contents').style('display', 'none');
  }
};

function changeSetVisibility(d) {
  var className = d3.select(this).attr('class');
  if(className == 'fa fa-caret-right') {
    d3.select(this).attr('class', 'fa fa-caret-down');
    d3.select('#' + constraintElementID(d) + '_sets').style('display', 'inherit');
  } else {
    d3.select(this).attr('class', 'fa fa-caret-right');
    d3.select('#' + constraintElementID(d) + '_sets').style('display', 'none');
  }
};

function changeSubConstraintVisibility(d) {
  if(d3.select(this).attr('class') == '') return;

  var className = d3.select(this).attr('class');
  if(className == 'fa fa-caret-right') {
    d3.select(this).attr('class', 'fa fa-caret-down');
    d3.select('#' + constraintElementID(d) + '_constraints').style('display', 'inherit');
  } else {
    d3.select(this).attr('class', 'fa fa-caret-right');
    d3.select('#' + constraintElementID(d) + '_constraints').style('display', 'none');
  }
};

function changeAppliedConstraints(typeName) {
  var constraintName = d3.select(this.parentNode.parentNode).datum();
  if(d3.select(this)[0][0].checked) {
    var include = renderer.hidden_constraints.filter(function(c) {
      return c._type == constraintName + '_' + typeName;
    });
    renderer.setcola.constraints = renderer.setcola.constraints.concat(include);
  } else {
    var exclude = renderer.setcola.constraints.filter(function(c) {
      return c._type == constraintName + '_' + typeName;
    });
    renderer.hidden_constraints = renderer.hidden_constraints.concat(exclude);
    renderer.setcola.constraints = renderer.setcola.constraints.filter(function(c) {
      return c._type != constraintName + '_' + typeName;
    });
  }
  renderer.restart();
};

/************************* Debug Helpers ***********************/

function getEnclosedNodes(set) {
  var nodes = [];
  set.forEach(function(element) {
    if(element instanceof Array) {
      nodes = nodes.concat(getEnclosedNodes(element));
    } else {
      nodes.push(element);
    }
  })
  return nodes;
};

/************************** Validation ************************/

inspector.toggleValidation = function() {

  var checked = document.getElementById('check-validon').checked;

  if(checked) {
    // Show the validation and show the errors.
    d3.select('.validatecontents').style('display', 'block');
    validationLegend();
    validator.validate();
  } else {
    // Hide the validation and redraw the graph.
    d3.select('.validatecontents').style('display', 'none');
    renderer.restart();
  }

};

function updateEpsilon() {
  var value = document.getElementById('range-epsilon').value;
  validator.EPSILON = Number(value);
  d3.select('#value-epsilon').html(value);

  validator.validate();
};

function validationLegend() {

  var legend = d3.select('.validatecontents').selectAll('.legend').data([0]);

  legend.enter().append('div')
      .attr('class', 'legend')
    .append('svg');

  var svg = d3.select('.legend svg')

  var color = d3.scaleSequential(d3.interpolateYlOrRd);
  var domain = [0, 0.25, 0.5, 0.75, 1];
  var size = 20;
  
  svg.selectAll('rect')
      .data(domain)
    .enter().append('rect')
      .style('width', size)
      .style('height', size)
      .style('x', function(d, i) { return (i + 1)*size; })
      .style('fill', function(d) { return color(d); });

  svg.selectAll('text')
      .data([0,1])
    .enter().append('text')
      .text(function(d) {
        var text;          
        if(d == 0) {
          text = d;
        } else if(d == 1) {
          text = validator.maxError && validator.maxError != 0 ? validator.maxError : '-';
        }
        return text;
      })
      .attr('x', function(d) { return d == 0 ? 0 : 125; })
      .attr('y', 15);
};

function updateLegend() {
  d3.select('.legend svg').selectAll('text')
      .text(function(d) {
        var text;          
        if(d == 0) {
          text = d;
        } else if(d == 1) {
          text = validator.maxError && validator.maxError != 0 ? validator.maxError : '-';
        }
        return text;
      })
      .attr('x', function(d) { return d == 0 ? 0 : 125; })
      .attr('y', 15);
};

/***************************************************************/
/*********************** Validation Pane ***********************/
/***************************************************************/

inspector.showCite = function() {
  clearInspector('cite');

  inspector.citeVisible = !inspector.citeVisible;
  if(inspector.citeVisible) {
    d3.select('.fa.fa-quote-right').style('color', '#b86fdc');
    var div = d3.select('.temp-region')
        .attr('class', 'temp-region cite')
        .style('display', 'flex');
  } else {
    d3.select('.fa.fa-quote-right').style('color', 'white');
    d3.select('.temp-region').style('display', 'none');
  }
};

/***************************************************************/
/*************************** Help Pane *************************/
/***************************************************************/

inspector.showHelp = function() {
  clearInspector('help');

  inspector.helpVisible = !inspector.helpVisible;
  if(inspector.helpVisible) {
    d3.select('.fa.fa-question-circle').style('color', '#78c801');
    var div = d3.select('.temp-region')
        .attr('class', 'temp-region help')
        .style('display', 'flex');
  } else {
    d3.select('.fa.fa-question-circle').style('color', 'white');
    d3.select('.temp-region').style('display', 'none');
  }
};

function showBibTeX(evt, type) {

  var contents = '@inproceedings{2016-setcola,\n  title = {SetCoLa: High-Level Constraints for Graph Layout},\n  author = {Jane Hoffswell AND Alan Borning AND Jeffrey Heer},\n  booktitle = {Computer Graphics Forum (Proc. EuroVis)},\n  year = {2018},\n  url = {https://homes.cs.washington.edu/~jhoffs/papers/2018-SetCoLa-EuroVis.pdf},\n}'

  var loc = location.hash;
  if(evt.srcElement.className.indexOf('selected') !== -1) {
    evt.srcElement.className = evt.srcElement.className.replace(' selected', '');
    var element = document.getElementById('BibTeX-' + type + '-' + loc);
    evt.srcElement.parentNode.removeChild(element);
  } else {
    evt.srcElement.className += ' selected';
    var parent = evt.srcElement.parentNode;
    var div = document.createElement('div');
    parent.append(div);
    div.className = 'bibtex';
    div.id = 'BibTeX-' + type + '-' + loc;
    var pre = document.createElement('pre');
    div.append(pre);
    pre.innerHTML = contents;
  }
}