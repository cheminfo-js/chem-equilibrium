'use strict';

var newtonRaphton = require('../../../src/core/NewtonRaphton');

//	public static Equilibrium setup(double constants[], double[][] coefficients, double[] totalConcentrations, double[] fixedConcentrations, int nPrecipitations) {
//components: 0: CO3--, 1: Ca++, 2: Fe++, 3: H+, 4: H2O (solvent) 5: OH- 6: HCO3-, 7: H2CO3
//rxns: 0: CO3-- -> CO3--, beta=1
//  1: Ca++ -> Ca++
//  2: Fe++ -> Fe++
//  3: H+ -> H+, beta= 1
//  4: H2O - H+ -> OH-    beta = 1e-14
//  5: H+ + CO3-- -> HCO3-, beta=2.1e10
//  6: 2H+ + CO3-- -> H2CO3, beta=2.2e17

//  7: Ca++ + CO3-- -> CaCO3 ksp = 4.8e-9
//  8: Ca++ + 2H2O - 2H+ -> Ca(OH)2 ksp = 4.68e22
//  9: Fe++ + CO3-- -> FeCO3 ksp = 3.3e-11
//  10: Fe++ + 2H2O - 2H+ -> Fe(OH)2 ksp = 4.87e21

var model = [
    //              CO3--     Ca++      Fe++      H+        OH-        HCO3-      H2CO3
    /* CO3-- */  [  1,        0,        0,        0,        0,         1,         1],
    /* Ca++  */  [  0,        1,        0,        0,        0,         0,         0],
    /* Fe++  */  [  0,        0,        1,        0,        0,         0,         0],
    /* H+    */  [  0,        0,        0,        1,        -1,        1,         2]
];
var beta = [1, 1, 1, 1, 1e-14, 2.1e10, 2.2e17];
var solidBeta = [4.8e-9, 4.68e22, 3.3e-11, 4.87e21];
var solidModel = [
    //              CaCO3     2Ca(OH)2     FeCO3      Fe(OH)
    /* CO3-- */  [  1,        0,           1,         0,     ],
    /* Ca++  */  [  1,        1,           0,         0,     ],
    /* Fe++  */  [  0,        0,           1,         1,     ],
    /* H+    */  [  0,       -2,           0,         -1,    ]
];
var cTotal = [0.1, 0.1, 0.1, 0.1];
var c = [0.01, 0.01, 0.01, 0.01];
var solidC = [0, 0, 0, 0];


var result = newtonRaphton(model, beta, cTotal, c, solidModel, solidBeta, solidC);