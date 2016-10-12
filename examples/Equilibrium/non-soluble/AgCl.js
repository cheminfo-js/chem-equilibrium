var newtonRaphton = require('../../src/NewtonRaphton');

//species: 0: Cl-, 1: Ag+,     2: AgCl
//rxns: 0: Cl- -> Cl-, beta=1
//  1: Ag+ -> Ag+,  beta = 1
//  2: Ag+ + Cl- -> AgCl, ksp=1.77e-10

var model = [[1,0],[0,1]];
var beta = [1, 1];
var cTotal = [1, 1];
var c = [0.1, 0.1];
var solidModel = [[1],[1]];
var solidBeta = [1.77e-10];
var cSolid = [0];
var spec = newtonRaphton(model, beta, cTotal, c, solidModel, solidBeta, cSolid);
console.log(spec);