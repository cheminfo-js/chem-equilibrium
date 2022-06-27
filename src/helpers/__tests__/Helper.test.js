import {
  equations1,
  acidBase,
  multiSolvent,
  AgClInDMSO,
  AgInWater,
} from '../../core/__tests__/data/equations';
import { Helper } from '../Helper';

describe('Helper', () => {
  it('should clone a helper', () => {
    let helper = new Helper({ database: equations1 });
    helper.addSpecie('D', 1);
    let clone = helper.clone();
    expect(helper.getSpecies()).toStrictEqual(clone.getSpecies());
  });
  it('should test various getters', () => {
    let helper = new Helper({ database: equations1 });
    expect(helper.getSpecies().sort()).toStrictEqual(['A', 'B', 'C', 'D', 'E']);
    expect(
      helper.getSpecies({ filtered: false, type: 'acidoBasic' }).sort(),
    ).toStrictEqual(['A', 'B']);
    expect(helper.getComponents().sort()).toStrictEqual(['B', 'D', 'E']);
    expect(
      helper.getComponents({ filtered: false, type: 'acidoBasic' }).sort(),
    ).toStrictEqual(['B']);
    expect(helper.getEquations().sort(equationSort)).toStrictEqual([
      { formed: 'A', components: { B: -1 }, type: 'acidoBasic', pK: 1 },
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);

    helper.addSpecie('D', 1);
    expect(helper.getSpecies({ filtered: true })).toStrictEqual([]);
    // getComponents only returns components when they form an equation
    expect(helper.getComponents({ filtered: true })).toStrictEqual([]);
    expect(
      helper.getEquations({ filtered: true }).sort(equationSort),
    ).toStrictEqual([]);
    helper.addSpecie('E', 1);
    expect(
      helper.getEquations({ filtered: true }).sort(equationSort),
    ).toStrictEqual([
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);
    expect(helper.getSpecies({ filtered: true }).sort()).toStrictEqual([
      'C',
      'D',
      'E',
    ]);
    expect(helper.getComponents({ filtered: true }).sort()).toStrictEqual([
      'D',
      'E',
    ]);

    helper.resetSpecies();
    expect(helper.getSpecies({ filtered: true })).toStrictEqual([]);
    expect(helper.getComponents({ filtered: true })).toStrictEqual([]);
    expect(helper.getEquations({ filtered: true })).toStrictEqual([]);

    // Test getters when there is inter-dependency
    helper = new Helper({ database: acidBase });
    helper.addSpecie('PO4---', 1);
    expect(helper.getComponents({ filtered: true }).sort()).toStrictEqual([
      'H+',
      'PO4---',
    ]);
    expect(helper.getSpecies({ filtered: true }).sort()).toStrictEqual([
      'H+',
      'H2O',
      'H2PO4-',
      'H3PO4',
      'HPO4--',
      'OH-',
      'PO4---',
    ]);

    helper = new Helper();
    helper.addSpecie('CH3COO-', 1);
  });

  it('should enable/disable equations', () => {
    let helper = new Helper({ database: equations1 });
    helper.disableEquation('A');
    expect(helper.getSpecies().sort()).toStrictEqual(['C', 'D', 'E']);
    expect(helper.getSpecies({ includeDisabled: true }).sort()).toStrictEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(
      helper.getSpecies({ filtered: false, type: 'acidoBasic' }).sort(),
    ).toStrictEqual([]);
    expect(helper.getComponents().sort()).toStrictEqual(['D', 'E']);
    expect(
      helper.getComponents({ filtered: false, type: 'acidoBasic' }).sort(),
    ).toStrictEqual([]);
    expect(
      helper.getComponents({ includeDisabled: true }).sort(),
    ).toStrictEqual(['B', 'D', 'E']);
    expect(helper.getEquations().sort(equationSort)).toStrictEqual([
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);
    expect(
      helper.getEquations({ includeDisabled: true }).sort(equationSort),
    ).toStrictEqual([
      {
        formed: 'A',
        components: { B: -1 },
        type: 'acidoBasic',
        pK: 1,
        disabled: true,
      },
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);
    helper.addSpecie('A', 1);
    helper.addSpecie('C', 1);
    let model = helper.getModel();
    expect(getComponent('D', model)).toStrictEqual({ label: 'D', total: 2 });
    expect(getComponent('E', model)).toStrictEqual({ label: 'E', total: 1 });
    expect(getFormedSpecie('C', model)).toStrictEqual({
      label: 'C',
      components: getExpectedComponents(['D', 2, 'E', 1], model),
      beta: 10,
      solid: true,
    });

    helper.enableEquation('A');
    expect(helper.getSpecies().sort()).toStrictEqual(['A', 'B', 'C', 'D', 'E']);

    helper.disableEquation('A');
    helper.disableEquation('C');
    expect(helper.getSpecies()).toStrictEqual([]);
    helper.enableAllEquations();
    expect(helper.getSpecies().sort()).toStrictEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('should create a Helper when from multi-solvent database', () => {
    let helper = new Helper({ database: multiSolvent });
    expect(helper.getSpecies().sort()).toStrictEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ]);
    helper = new Helper({ database: multiSolvent, solvent: 'DMSO' });
    expect(helper.getSpecies().sort()).toStrictEqual([
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
    ]);
  });

  it('in water, it should create acid/base model just by adding one component', () => {
    let helper = new Helper({ database: acidBase });
    helper.addSpecie('CH3COO-', 1);
    let model = helper.getModel();
    helper.getEquilibrium();
    expect(model.components).toHaveLength(2);
    expect(model.formedSpecies).toHaveLength(2);
  });

  it('should create a model where one component has a fixed concentration at equilibrium', () => {
    let helper = new Helper({ database: equations1 });
    helper.addSpecie('A', 1);
    helper.addSpecie('C', 1);
    helper.addSpecie('B', 1);

    helper.addSpecie('X', 1); // should have no effect (specie not in database)
    helper.setAtEquilibrium('E', 2);
    helper.setAtEquilibrium('Y', 1); // should have no effect (specie not in database)
    let model = helper.getModel();
    expect(getComponent('B', model)).toStrictEqual({ label: 'B', total: 0 });
    expect(getComponent('D', model)).toStrictEqual({ label: 'D', total: 2 });
    expect(getComponent('E', model)).toStrictEqual({
      label: 'E',
      atEquilibrium: 2,
    });
    expect(getFormedSpecie('A', model)).toStrictEqual({
      label: 'A',
      beta: 10,
      components: getExpectedComponents(['B', -1], model),
      solid: false,
    });
    expect(getFormedSpecie('C', model)).toStrictEqual({
      label: 'C',
      beta: 10,
      components: getExpectedComponents(['D', 2, 'E', 1], model),
      solid: true,
    });
  });

  it('should create acid/base model', () => {
    let helper = new Helper({ database: acidBase });
    helper.addSpecie('CO3--', 1);
    helper.addSpecie('HCO3-', 1);
    helper.addSpecie('OH-', 1);
    let model = helper.getModel();
    expect(model.components).toHaveLength(2);
    expect(model.formedSpecies).toHaveLength(3);

    expect(getComponent('CO3--', model)).toStrictEqual({
      label: 'CO3--',
      total: 2,
    });
    expect(getComponent('H+', model)).toStrictEqual({ label: 'H+', total: 0 });

    expect(getFormedSpecie('H2CO3', model)).toStrictEqual({
      label: 'H2CO3',
      beta: Math.pow(10, 10.33 + 6.3),
      components: getExpectedComponents(['CO3--', 1, 'H+', 2], model),
      solid: false,
    });

    expect(getFormedSpecie('HCO3-', model)).toStrictEqual({
      label: 'HCO3-',
      beta: Math.pow(10, 10.33),
      components: getExpectedComponents(['H+', 1, 'CO3--', 1], model),
      solid: false,
    });

    expect(getFormedSpecie('OH-', model)).toStrictEqual({
      label: 'OH-',
      beta: Math.pow(10, -14),
      components: getExpectedComponents(['H+', -1], model),
      solid: false,
    });
  });

  it('should create a very simple precipitation model (in DMSO)', () => {
    let helper = new Helper({
      solvent: 'DMSO',
      database: AgClInDMSO,
    });
    helper.addSpecie('AgCl', 1);
    let model = helper.getModel();
    expect(model.components).toHaveLength(2);
    // A complex and a precipitate are formed
    expect(model.formedSpecies).toHaveLength(2);
    expect(getComponent('Ag+', model)).toStrictEqual({
      label: 'Ag+',
      total: 1,
    });
    expect(getComponent('Cl-', model)).toStrictEqual({
      label: 'Cl-',
      total: 1,
    });
    expect(getFormedSpecie('AgCl', model)).toStrictEqual({
      label: 'AgCl',
      beta: Math.pow(10, 9.74),
      components: getExpectedComponents(['Ag+', 1, 'Cl-', 1], model),
      solid: true,
    });
    expect(getFormedSpecie('AgCl2-', model)).toStrictEqual({
      label: 'AgCl2-',
      beta: Math.pow(10, 5.26),
      components: getExpectedComponents(['Ag+', 1, 'Cl-', 2], model),
      solid: false,
    });
  });

  it('should create precipitation model with OH- precipitation', () => {
    let helper = new Helper({ database: AgInWater });
    helper.addSpecie('Ag+', 1);
    let model = helper.getModel();
    expect(model.components).toHaveLength(2);
    expect(model.formedSpecies).toHaveLength(2);
    expect(getComponent('Ag+', model)).toStrictEqual({
      label: 'Ag+',
      total: 1,
    });
    expect(getComponent('H+', model)).toStrictEqual({ label: 'H+', total: 0 });
    expect(getFormedSpecie('AgOH', model)).toStrictEqual({
      label: 'AgOH',
      beta: Math.pow(10, 7.72 - 14),
      components: getExpectedComponents(['Ag+', 1, 'H+', -1], model),
      solid: true,
    });
  });
});

function getIndexes(labels, model) {
  let indexes = new Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    indexes[i] = model.components.findIndex((c) => c.label === labels[i]);
  }
  return indexes;
}

function getExpectedComponents(labels, model) {
  let l = [];
  let v = [];
  for (let i = 0; i < labels.length; i++) {
    if (i % 2 === 0) l.push(labels[i]);
    else v.push(labels[i]);
  }
  let indexes = getIndexes(l, model);

  let expected = new Array(model.components.length).fill(0);
  for (let i = 0; i < indexes.length; i++) {
    expected[indexes[i]] = v[i];
  }
  return expected;
}

function getFormedSpecie(label, model) {
  return model.formedSpecies.find((s) => s.label === label);
}

function getComponent(label, model) {
  return model.components.find((c) => c.label === label);
}

function equationSort(a, b) {
  if (a.formed < b.formed) return -1;
  else if (a.formed > b.formed) return 1;
  return 0;
}
