'use strict';

var newtonRaphton = require('../../src/NewtonRaphton');

//	public static Equilibrium setup(double constants[], double[][] coefficients, double[] totalConcentrations, double[] fixedConcentrations, int nPrecipitations) {
//components: 0: CO3--, 1: Ca++, 2: Fe++, 3: H+, 4: H2O (solvent) 5: OH- 6: HCO3-, 7: H2CO3
//rxns:
// Components
// CO3-- -> CO3--, beta=1
// Fe++ -> Fe
// H+ -> H+, beta= 1

// Species
// H2O - H+ -> OH-    beta = 1e-14
// H+ + CO3-- -> HCO3-, beta=2.1e10
// 2H+ + CO3-- -> H2CO3, beta=2.2e17

// Solids
// Fe++ + CO3-- -> FeCO3 ksp = 3. -11

var model = [
    //              CO3--      Fe++      H+        OH-        HCO3-      H2CO3
    /* CO3-- */  [  1,         0,        0,        0,         1,         1],
    /* Fe++  */  [  0,         1,        0,        0,         0,         0],
    /* H+    */  [  0,         0,        1,        -1,        1,         2]
];
var beta = [1, 1, 1, 1e-14, 2.1e10, 2.2e17];
var solidBeta = [3.3e-11];
var solidModel = [
    //            FeCO3
    /* CO3-- */  [1,    ],
    /* Fe++  */  [1,    ],
    /* H+    */  [0,    ]
];
var cTotal = [0.1, 0.1, 0.1];
var c = [0.001, 0.001, 0.001];
var solidC = [0];


var result = newtonRaphton(model, beta, cTotal, c);
var initialC = result.slice(0, c.length);
result = newtonRaphton(model, beta, cTotal, initialC, solidModel, solidBeta, solidC);
console.log(result);
