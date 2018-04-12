var validator = {};

/***************************************************************/
/******************** CONSTRAINT VALIDATION ********************/
/***************************************************************/

validator.init = function() {
  validator.EPSILON = 0.5;
  validator.type = 'DIFF';
};

validator.validate = function() {

  var checked = document.getElementById('check-validtype').checked;
  validator.type = checked ? 'DIFF' : 'COUNT';

  switch(validator.type) {
    case 'DIFF':
      diffErrors();
      break;
    case 'COUNT':
      countErrors();
      break;
    default:
      console.error('Unknown validation type: \'' + validator.type + '\'');
  }

  updateLegend();
};

/************* Validate Graph on Cola Constraints **************/

function diffErrors() {
  var nodes = graph.spec.nodes;
  validator.unsatisfiable = 0;
  validator.maxError = 0;

  validator.errors = {};
  graph.spec.constraints.forEach(function(constraint) {

    constraint.unsat = false;

    if(constraint.type == 'alignment') {
      
      var pos = nodes[constraint.offsets[0].node][constraint.axis];
      constraint.offsets.forEach(function(obj) {

        var error = Math.abs(nodes[obj.node][constraint.axis] - pos);

        if(error != 0 && !nodes[obj.node].temp) {
          validator.unsatisfiable += 1;
          constraint.unsat = true;
          validator.errors[obj.node] = (validator.errors[obj.node] || 0) + error;
          validator.maxError = Math.max(validator.errors[obj.node], validator.maxError);
        }
      });

    } else if(constraint.left != undefined && constraint.right != undefined) {

      var left = nodes[constraint.left];
      var right = nodes[constraint.right];

      var valid = left[constraint.axis] + constraint.gap <= right[constraint.axis];
      if(!valid) {

        var error = Math.abs(right[constraint.axis] - left[constraint.axis] - constraint.gap);

        validator.unsatisfiable += 1;
        constraint.unsat = true;

        var leftError = !left.temp ? (validator.errors[constraint.left] || 0) + error : 0;
        var rightError = !right.temp ? (validator.errors[constraint.right] || 0) + error : 0;
        
        if(!left.temp) validator.errors[constraint.left] = leftError;
        if(!right.temp) validator.errors[constraint.right] = rightError;
        
        validator.maxError = Math.max(leftError, rightError, validator.maxError);

      }

    } else {
      console.log('Other constraint type: ', constraint);
    }

    renderer.showError();
  });
};

function countErrors() {
  var nodes = graph.spec.nodes;
  validator.unsatisfiable = 0;
  validator.maxError = 0;

  validator.errors = {};
  graph.spec.constraints.forEach(function(constraint) {

    constraint.unsat = false;

    if(constraint.type == 'alignment') {
      
      var pos = nodes[constraint.offsets[0].node][constraint.axis];
      constraint.offsets.forEach(function(obj) {
        if(nodes[obj.node][constraint.axis] != pos && !nodes[obj.node].temp) {
          validator.unsatisfiable += 1;
          constraint.unsat = true;
          validator.errors[obj.node] = (validator.errors[obj.node] || 0) + 1;
          validator.maxError = Math.max(validator.errors[obj.node], validator.maxError);
        }
      });

    } else if(constraint.left != undefined && constraint.right != undefined) {

      var left = nodes[constraint.left];
      var right = nodes[constraint.right];

      var valid = left[constraint.axis] + constraint.gap <= right[constraint.axis];
      if(!valid) valid = Math.abs(right[constraint.axis] - left[constraint.axis] - constraint.gap) <= validator.EPSILON;
      if(!valid) {
        validator.unsatisfiable += 1;
        constraint.unsat = true;

        var leftError = !left.temp ? (validator.errors[constraint.left] || 0) + 1 : 0;
        var rightError = !right.temp ? (validator.errors[constraint.right] || 0) + 1 : 0;
        
        if(!left.temp) validator.errors[constraint.left] = leftError;
        if(!right.temp) validator.errors[constraint.right] = rightError;
        
        validator.maxError = Math.max(leftError, rightError, validator.maxError);

      }

    } else {
      console.log('Other constraint type: ', constraint);
    }

    renderer.showError();
  });
};

validator.getInvalidConstraints = function(node) {
  var unsatisfiable = graph.spec.constraints.filter(function(constraint) {

    var invalid = false;
    if(!constraint.unsat) return false;

    if(constraint.type == 'alignment') {
      
      constraint.offsets.forEach(function(obj) {
        invalid = invalid || obj.node == node._id;
      });

    } else if(constraint.left != undefined && constraint.right != undefined) {

      invalid = invalid || constraint.left == node._id || constraint.right == node._id; 

    } else {
      console.log('Other constraint type: ', constraint);
    }

    return invalid;

  });

  return unsatisfiable;
};

validator.constraintsOfNode = function(node) {
  if(!(node instanceof Object)) node = graph.spec.nodes[node];

  var constraints = graph.spec.constraints.filter(function(constraint) {

    var containsNode = false;

    if(constraint.type == 'alignment') {
      
      constraint.offsets.forEach(function(obj) {
        containsNode = containsNode || obj.node == node._id;
      });

    } else if(constraint.left != undefined && constraint.right != undefined) {

      containsNode = containsNode || constraint.left == node._id || constraint.right == node._id; 

    } else {
      console.log('Other constraint type: ', constraint);
    }

    return containsNode;

  });

  return constraints;
};

/*************** Show Invalid Constraint Pairs *****************/

function linkErrors() {

};
