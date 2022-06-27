import { EquationSet } from '../EquationSet';

const {
  equations1,
  equations2,
  equations3,
  equations4,
  circularEquations,
} = require('./../data/equations');

describe('EquationSet', () => {
  it('should clone an equation set', () => {
    let eqSet = new EquationSet(equations1);
    let newSet = eqSet.clone();
    expect([...newSet.keys()]).toStrictEqual([...eqSet.keys()]);
  });

  it('should create and normalize an equation set (no inter-dependencies)', () => {
    let eqSet = new EquationSet(equations1);
    let norm = eqSet.getNormalized('E');
    expect(norm.size).toBe(2);
  });

  it('should create and normalize an equation set (with inter-dependencies, example 1)', () => {
    let eqSet = new EquationSet(equations2);
    let norm = eqSet.getNormalized('E');
    expect(norm.size).toBe(2);
    let A = norm.get('A', true);
    let B = norm.get('B', true);
    expect(A.pK).toBe(8);
    expect(B.pK).toBe(3);
  });

  it('should create and normalize an equation set (with inter-dependencies, example 2)', () => {
    let eqSet = new EquationSet(equations3);
    let norm = eqSet.getNormalized('E');
    expect(norm.size).toBe(2);
    let A = norm.get('A', true);
    let B = norm.get('B', true);
    expect(A.pK).toBe(1);
    expect(B.pK).toBe(3);
  });

  it('should get a subset of an equation set', () => {
    let eqSet = new EquationSet(equations4);
    let subSet = eqSet.getSubset(['C', 'D']);
    expect(subSet.size).toBe(2);
  });

  it('should get subset of an equation set', () => {
    let eqSet = new EquationSet(equations2);
    let subSet = eqSet.getSubset(['A']);
    expect(subSet.size).toBe(2);
  });

  it('should get the model given the totals', () => {
    let eqSet = new EquationSet(equations2);
    let normSet = eqSet.getNormalized('E');
    normSet.getModel({ A: 1 });
  });

  it('should throw when normalizing an equations set with a circular dependency', () => {
    let eqSet = new EquationSet(circularEquations);
    expect(function () {
      eqSet.getNormalized();
    }).toThrow(/circular/);
  });
});
