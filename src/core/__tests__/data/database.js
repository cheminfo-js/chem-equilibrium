'use strict';

const EquationSet = require('../../src/core/EquationSet');
const equations = require('../../data/data.json');
describe('database', () => {
  it('verify database can be initialized  in an EquationSet', () => {
    new EquationSet(equations);
  });

  it('verify database can be normalized in water', () => {
    const eqSet = new EquationSet(equations);
    eqSet.getNormalized('H2O');
  });
});
