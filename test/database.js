'use strict';

const EquationSet = require('../src/EquationSet');
const equations = require('../data/data.json');
describe('database', function () {
    it('verify database can be initialized  in an EquationSet', function () {
        new EquationSet(equations);
    });

    it('verify database can be normalized in water', function () {
        const eqSet = new EquationSet(equations);
        eqSet.getNormalized('H2O');
    });
});