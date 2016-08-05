'use strict';

var Equilibrium = require('../src/index');

var equilibriumModel = {
    "components": [
        {"label": "H+", atEquilibrium: Math.pow(10, -12.32)},
        {"label": "PO4---", "total": 1}
    ],
    "formedSpecies": [
        {"label": "OH-", "beta": Math.pow(10, -14), "components": [-1, 0]},
        {"label": "H3PO4", "beta": Math.pow(10, 21.69), "components": [3, 1]},
        {"label": "H2PO4-", "beta": Math.pow(10, 19.53), "components": [2, 1]},
        {"label": "HPO4--", "beta": Math.pow(10, 12.32), "components": [1, 1]}
    ]
};

var eq = new Equilibrium(equilibriumModel);
var solution = eq.solveRobust();
console.log(solution);


