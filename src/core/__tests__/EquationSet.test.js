'use strict';

const EquationSet = require('../../src/core/EquationSet');
const eq = require('./../data/equations');

describe('EquationSet', () => {
  it('should clone an equation set', () => {
    var eqSet = new EquationSet(eq.equations1);
    var newSet = eqSet.clone();
    expect([...newSet.keys()]).deepEqual([...eqSet.keys()]);
  });

  it('should create and normalize an equation set (no inter-dependencies)', () => {
    var eqSet = new EquationSet(eq.equations1);
    var norm = eqSet.getNormalized('E');
    expect(norm.size).toEqual(2);
  });

  it('should create and normalize an equation set (with inter-dependencies, example 1)', () => {
    var eqSet = new EquationSet(eq.equations2);
    var norm = eqSet.getNormalized('E');
    expect(norm.size).toEqual(2);
    var A = norm.get('A', true);
    var B = norm.get('B', true);
    expect(A.pK).toEqual(8);
    expect(B.pK).toEqual(3);
  });

  it('should create and normalize an equation set (with inter-dependencies, example 2)', () => {
    var eqSet = new EquationSet(eq.equations3);
    var norm = eqSet.getNormalized('E');
    expect(norm.size).toEqual(2);
    var A = norm.get('A', true);
    var B = norm.get('B', true);
    expect(A.pK).toEqual(1);
    expect(B.pK).toEqual(3);
  });

  it('should get a subset of an equation set', () => {
    var eqSet = new EquationSet(eq.equations4);
    var subSet = eqSet.getSubset(['C', 'D']);
    expect(subSet.size).toEqual(2);
  });

  it('should get subset of an equation set', () => {
    var eqSet = new EquationSet(eq.equations2);
    var subSet = eqSet.getSubset(['A']);
    expect(subSet.size).toEqual(2);
  });

  it('should get the model given the totals', () => {
    var eqSet = new EquationSet(eq.equations2);
    var normSet = eqSet.getNormalized('E');
    normSet.getModel({ A: 1 });
  });

  it('should throw when normalizing an equations set with a circular dependency', () => {
    var eqSet = new EquationSet(eq.circularEquations);
    expect(function () {
      eqSet.getNormalized();
    }).toThrowError(/circular/);
  });
});
