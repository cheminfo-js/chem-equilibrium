'use strict';

var Equilibrium = require('../../..');

var equilibriumModel = {
    "components": [
        {"label": "H+", atEquilibrium: Math.pow(10, -4.75)},
        {"label": "CH3COO-", "total": 1}
    ],
    "formedSpecies": [
        {"label": "OH-", "beta": Math.pow(10, -14), "components": [-1, 0]},
        {"label": "CH3COOH", "beta": Math.pow(10, 4.75), "components": [1, 1]}
    ]
};

var eq = new Equilibrium(equilibriumModel);
var solution = eq.solve();
console.log(solution);


