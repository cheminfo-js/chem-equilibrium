var newtonRaphton = require('../../src/NewtonRaphton');

//species: 0: Cl-, 1: Ag+,     2: AgCl
//rxns: 0: Cl- -> Cl-, beta=1
//  1: Ag+ -> Ag+,  beta = 1
//  2: Ag+ + Cl- -> AgCl, ksp=1.77e-10

newtonRaphton([[1,0],[0,1]], [1, 1], [0.1, 0.1], [0.1, 0.1], [[1],[1]], [1.77e-10], [0]);