'use strict';

const Equation = require('../Equation');
const eqA = new Equation({
  formed: 'A',
  components: {
    B: 1,
    C: 1,
  },
  pK: 1,
  type: 'acidoBasic',
});

describe('Equation', () => {
  it('solvent is the formed specie', () => {
    var eq = eqA.withSolvent('A');
    expect(eq.formed).toEqual('B');
    expect(eq.components).deepEqual({ C: -1 });
    expect(eq.pK).toEqual(-1);
    expect(eq.type).toEqual('acidoBasic');
  });

  it('solvent is a component', () => {
    var eq = eqA.withSolvent('B');
    expect(eq.formed).toEqual('A');
    expect(eq.components).deepEqual({ C: 1 });
    expect(eq.pK).toEqual(1);
    expect(eq.type).toEqual('acidoBasic');
  });

  it('solvent is not in the equation', () => {
    var eq = eqA.withSolvent('D');
    expect(eq.formed).toEqual('A');
    expect(eq.components).deepEqual({ B: 1, C: 1 });
    expect(eq.pK).toEqual(1);
    expect(eq.type).toEqual('acidoBasic');
  });
});
