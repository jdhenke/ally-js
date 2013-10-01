/********************************************************************

Implementation of Brendan Cooley's Actor Alliance Game

state ::= dictionary of (string) variable names ==> (float) values

result ::= result of completion of the game. Object with methods:
          - getVar(varName) ==> float ::= value of that variable
          - getUtil(actorName) ==> float ::=  utility of that actor

node ::= decision in game tree. admits multiple implementations.
          - solve(state) ==> result

********************************************************************/

// get third party requirements

var _ = require("underscore");

// math helper functions

/* returns an array of N samples randomly pulled from Norm(mu, sigma2) */
function sampleGaussian(mu, sigma2, N) {
  var output = [];
  var stdDev = Math.sqrt(sigma2);
  while (output.length < N) {
    var u = 2 * Math.random() - 1;
    var v = 2 * Math.random() - 1;
    var r = u*u + v*v;
    if (r === 0 || r > 1) {
      continue;
    }
    var c = Math.sqrt(-2 * Math.log(r) / r);
    output.push(mu + stdDev * u * c);
  }
  return output;
}

/* returns average of nums */
function getMean(nums) {
  return _.reduce(nums, function(a, b) {
    return a + b;
  }, 0) / nums.length;
}

/* returns variance of nums */
function getVariance(nums) {

  var mean = getMean(nums);
  var variance = _.reduce(nums, function(a, b) {
    return a + Math.pow(b - mean, 2);
  }, 0) / (1.0 * nums.length);
  return variance;
}

// define nodes

/* creates a node representing an end state in the game */
function TerminalNode(nodeName, utilities) {
  
  this.solve = function(state) {
    return {
      getVar: function(varName) {
        return state[varName];
      },
      getUtil: function(actorName) {
        var output = utilities[actorName](state);
        return output;
      },
      name: nodeName,
    }
  }
}

/* creates a node which must choose between one of it's child nodes */
function DiscreteNode(actorName, children) {
  
  this.solve = function(state) {
    return _.chain(children)
      .map(function(child) {
        return child.solve(state);
      })
      .sortBy(function(result) {
        return 0 - result.getUtil(actorName);
      }).value()[0];
  }
}

/* creates a node which must choose a continuous value */
function ContinuousNode(child, varName, actorName) {

  this.solve = function(state) {

    // parameters of cross entropy
    var mu = 0, 
        sigma2 = 10,  // bigger seems to work well
        maxIters = 50, 
        epsilon = 0.0001, 
        N = 100, 
        nTop = 10;

    // returns result of each sampled value for outcome
    function evaluate(samples) {
      var output = _.map(samples, function(sample) {
        var extension = {};
        extension[varName] = sample;
        var newState = _.extend(extension, state);
        return child.solve(newState);
      });
      return output;
    }

    // iteratively converge on result
    var t = 0;
    while ((t < maxIters) && (sigma2 > epsilon)) {

      var samples = sampleGaussian(mu, sigma2, N);
      var results = evaluate(samples);
      var sortedResults = _.sortBy(results, function(result) {
        return 0 - result.getUtil(actorName);
      });
      var topResults = sortedResults.slice(0, nTop);
      var distro = _.map(topResults, function(result) {
        return result.getVar(varName);
      });
      mu = getMean(distro);
      sigma2 = getVariance(distro);
      t = t + 1;
    }

    // return result
    var extension = {};
    extension[varName] = mu;
    var finalState = _.extend(extension, state);
    var output = child.solve(finalState);
    return output;
  } 
}

// create actions

function render(result) {
  // TODO
  ;
}

/* expects dictionary of string ==> float */
function execute() {
  var state = getState();
  var root = getRoot();
  var result = root.solve(state);
  render(result);
}

// parameters specific to Brendan's game

function getState() {

  var pd1 = .626,
      pr1 = .283,
      pa = .1,
      pd2 = .426,
      pr2 = .483,
      k = .15,

      ba = pa,
      bd = pd1,
      br = pr1;

  return {
    pd1: pd1, 
    pr1: pr1, 
    pa:  pa, 
    pd2: pd2, 
    pr2: pr2, 
    k:   k, 
    ba:  ba, 
    bd:  bd, 
    br:  br, 
  };
}

/* returns root of tree model */
function getRoot() {

  var t6 = new TerminalNode("t6", {
    "d": function(s) { return s.bd - s.xi - s.xj - s.yi; },
    "r": function(s) { return s.br + s.xi + s.yi; },
    "a": function(s) { return s.ba + s.xj; },
  });

  var t7 = new TerminalNode("t7", {
    "d": function(s) {return (s.bd-s.xi-s.xj)+(s.pd2+s.pa)*(s.br+s.xi)*(s.pd2/(s.pd2+s.pa))-s.pr2*(s.bd-s.xi-s.xj)-s.k*(s.pd2/(s.pd2+s.pa))},
    "r": function(s) {return (s.br+s.xi)+s.pr2*(s.bd-s.xi+s.ba)-(s.pd2+s.pa)*(s.br+s.xi)-s.k},
    "a": function(s) {return (s.ba+s.xj)+(s.pd2+s.pa)*(s.br+s.xi)*(s.pa/(s.pd2+s.pa))-s.pr2*(s.ba+s.xj)-s.k*(s.pa/(s.pd2+s.pa))},
  });

  var r1; // TODO

  var t3 = new TerminalNode("t3", {
    "d": function(s) {return (s.bd-s.xi-s.xj)+(s.pd2+s.pa)*(s.br+s.xi)*(s.pd2/(s.pd2+s.pa))-s.pr2*(s.bd-s.xi-s.xj)-s.k*(s.pd2/(s.pd2+s.pa))},
    "r": function(s) {return (s.br+s.xi)+s.pr2*(s.bd-s.xi+s.ba)-(s.pd2+s.pa)*(s.br+s.xi)-s.k},
    "a": function(s) {return (s.ba+s.xj)+(s.pd2+s.pa)*(s.br+s.xi)*(s.pa/(s.pd2+s.pa))-s.pr2*(s.ba+s.xj)-s.k*(s.pa/(s.pd2+s.pa))},
  });

  var d1; // TODO

  var t8 = new TerminalNode("t8", {
    "d": function(s) {return s.bd-s.xi-s.yj},
    "r": function(s) {return s.br+s.xi+s.yj},
    "a": function(s) {return s.ba},
  })

  var t9 = new TerminalNode("t9", {
    "d": function(s) {return (s.bd-s.xi)+s.pd2*(s.br+s.xi)-s.pr2*(s.bd-s.xi)-s.k},
    "r": function(s) {return (s.br+s.xi)+s.pr2*(s.bd-s.xi)-s.pd2*(s.br+s.xi)-s.k},
    "a": function(s) {return s.ba},
  })

  var r2; // TODO

  var t4 = new TerminalNode("t4", {
    "d": function(s) {return (s.bd - s.xi)+s.pd2*(s.br+s.xi)-s.pr2*(s.bd-s.xi)-s.k},
    "r": function(s) {return (s.br+s.xi)+s.pr2*(s.bd-s.xi)-s.pd2*(s.br+s.xi)-s.k},
    "a": function(s) {return s.ba},
  });

  var d2 // TODO

  var t10 = new TerminalNode("t10", {
    "d": function(s) {return s.bd - s.xi-s.yk},
    "r": function(s) {return s.br+s.xi-s.xk+s.yk},
    "a": function(s) {return s.ba+s.xk},
  });

  var t11 = new TerminalNode("t11", {
    "d": function(s) {return (s.bd-s.xi)+s.pd2*(s.br+s.xi+s.ba)-(s.pr2+s.pa)*(s.bd-s.xi)-s.k},
    "r": function(s) {return (s.br+s.xi-s.xk)+(s.pr2+s.pa)*(s.bd-s.xi)*(s.pr2/(s.pr2+s.pa))-s.pd2*(s.br+s.xi-s.xk)-s.k*(s.pr2/(s.pr2+s.pa))},
    "a": function(s) {return (s.ba+s.xk)+(s.pr2+s.pa)*(s.bd-s.xi)*(s.pa/(s.pr2+s.pa))-s.pd2*(s.ba+s.xk)-s.k*(s.pa/(s.pr2+s.pa))},
  });

  var r3; // TODO

  var t5 = new TerminalNode("t5", {
    "d": function(s) {return (s.bd-s.xi)+s.pd2*(s.br+s.xi+s.ba)-(s.pr2+s.pa)*(s.bd-s.xi)-s.k},
    "r": function(s) {return (s.br+s.xi-s.xk)+(s.pr2+s.pa)*(s.bd-s.xi)*(s.pr2/(s.pr2+s.pa))-s.pd2*(s.br+s.xi-s.xk)-s.k*(s.pr2/(s.pr2+s.pa))},
    "a": function(s) {return (s.ba+s.xk)+(s.pr2+s.pa)*(s.bd-s.xi)*(s.pa/(s.pr2+s.pa))-s.pd2*(s.ba+s.xk)-s.k*(s.pa/(s.pr2+s.pa))},
  });

  var d3; // TODO

  var a0; // TOOD

  var t2 = new TerminalNode("t2", {
    "d": function(s) {return s.bd+s.pd1*s.br-s.pr1*s.bd-s.k},
    "r": function(s) {return s.br+s.pr1*s.bd-s.pd1*s.br-s.k},
    "a": function(s) {return s.ba},
  });

  var r0; // TODO

  var t1 = new TerminalNode("t1", {
    "d": function(s) {return s.bd+s.pd1*s.br-s.pr1*s.bd-s.k},
    "r": function(s) {return s.br+s.pr1*s.bd-s.pd1*s.br-s.k},
    "a": function(s) {return s.ba},
  });

  var d0; // TODO

  return t1;
}

// main

execute();