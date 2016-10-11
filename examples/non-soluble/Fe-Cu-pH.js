'use strict';
const Equilibrium = require('../../src/Equilibrium');

var model = {
    "volume": 1,
    "components": [
        {
            "label": "H+",
            "total": 0
        },
        {
            "label": "Cu++",
            "total": 0.1
        },
        {
            "label": "Fe+++",
            "total": 0.1
        }
    ],
    "formedSpecies": [
        {
            "solid": false,
            "label": "OH-",
            "beta": 1e-14,
            "components": [
                -1,
                0,
                0
            ]
        },
        {
            "solid": true,
            "label": "Cu(OH)2",
            "beta": 1584893192.4611108,
            "components": [
                -2,
                1,
                0
            ]
        },
        {
            "solid": true,
            "label": "Fe(OH)3",
            "beta": 2818.382931264472,
            "components": [
                -3,
                0,
                1
            ]
        }
    ]
};

model.components[0].atEquilibrium = Math.pow(10, -1.5);

var eq = new Equilibrium(model);
var sol = eq.solveRobust();
console.log(sol);

