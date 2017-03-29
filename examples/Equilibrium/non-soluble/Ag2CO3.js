const Equilibrium = require('../../..');

const model = {
    "volume": 1,
    "components": [
        {
            "label": "H+",
            "total": 0
        },
        {
            "label": "Ag+",
            "total": 2
        },
        {
            "label": "CO3--",
            "total": 1
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
            "label": "Ag2CO3",
            "beta": 125892541179.41661,
            "components": [
                0,
                2,
                1
            ]
        },
        {
            "solid": false,
            "label": "HCO3-",
            "beta": 21379620895.022324,
            "components": [
                1,
                0,
                1
            ]
        },
        {
            "solid": true,
            "label": "AgOH",
            "beta": 5.248074602497723e-7,
            "components": [
                -1,
                1,
                0
            ]
        },
        {
            "solid": false,
            "label": "H2CO3",
            "beta": 42657951880159170,
            "components": [
                2,
                0,
                1
            ]
        }
    ]
};

model.components[0].atEquilibrium = Math.pow(10, -6);

var eq = new Equilibrium(model);
var sol = eq.solveRobust();
console.log(sol);