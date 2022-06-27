import { Equation } from '../Equation';

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
    let eq = eqA.withSolvent('A');
    expect(eq.formed).toBe('B');
    expect(eq.components).deepEqual({ C: -1 });
    expect(eq.pK).toEqual(-1);
    expect(eq.type).toBe('acidoBasic');
  });

  it('solvent is a component', () => {
    let eq = eqA.withSolvent('B');
    expect(eq.formed).toBe('A');
    expect(eq.components).deepEqual({ C: 1 });
    expect(eq.pK).toBe(1);
    expect(eq.type).toBe('acidoBasic');
  });

  it('solvent is not in the equation', () => {
    let eq = eqA.withSolvent('D');
    expect(eq.formed).toBe('A');
    expect(eq.components).deepEqual({ B: 1, C: 1 });
    expect(eq.pK).toBe(1);
    expect(eq.type).toBe('acidoBasic');
  });
});
