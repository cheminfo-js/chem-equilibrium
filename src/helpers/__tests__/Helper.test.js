'use strict';
const Helper = require('../Helper');
const eq = require('../../../test/data/equations');

describe('Helper', () => {
  it('should clone a helper', () => {
    var helper = new Helper({ database: eq.equations1 });
    helper.addSpecie('D', 1);
    var clone = helper.clone();
    expect(helper.getSpecies()).deepEqual(clone.getSpecies());
  });
  it('should test various getters', () => {
    var helper = new Helper({ database: eq.equations1 });
    expect(helper.getSpecies().sort()).deepEqual(['A', 'B', 'C', 'D', 'E']);
    expect(
      helper.getSpecies({ filtered: false, type: 'acidoBasic' }).sort(),
    ).deepEqual(['A', 'B']);
    expect(helper.getComponents().sort()).deepEqual(['B', 'D', 'E']);
    expect(
      helper.getComponents({ filtered: false, type: 'acidoBasic' }).sort(),
    ).deepEqual(['B']);
    expect(helper.getEquations().sort(equationSort)).deepEqual([
      { formed: 'A', components: { B: -1 }, type: 'acidoBasic', pK: 1 },
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);

    helper.addSpecie('D', 1);
    expect(helper.getSpecies({ filtered: true })).deepEqual([]);
    // getComponents only returns components when they form an equation
    expect(helper.getComponents({ filtered: true })).deepEqual([]);
    expect(
      helper.getEquations({ filtered: true }).sort(equationSort),
    ).deepEqual([]);
    helper.addSpecie('E', 1);
    expect(
      helper.getEquations({ filtered: true }).sort(equationSort),
    ).deepEqual([
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);
    expect(helper.getSpecies({ filtered: true }).sort()).deepEqual([
      'C',
      'D',
      'E',
    ]);
    expect(helper.getComponents({ filtered: true }).sort()).deepEqual([
      'D',
      'E',
    ]);

    helper.resetSpecies();
    expect(helper.getSpecies({ filtered: true })).deepEqual([]);
    expect(helper.getComponents({ filtered: true })).deepEqual([]);
    expect(helper.getEquations({ filtered: true })).deepEqual([]);

    // Test getters when there is inter-dependency
    helper = new Helper({ database: eq.acidBase });
    helper.addSpecie('PO4---', 1);
    expect(helper.getComponents({ filtered: true }).sort()).deepEqual([
      'H+',
      'PO4---',
    ]);
    expect(helper.getSpecies({ filtered: true }).sort()).deepEqual([
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
    var helper = new Helper({ database: eq.equations1 });
    helper.disableEquation('A');
    expect(helper.getSpecies().sort()).deepEqual(['C', 'D', 'E']);
    expect(helper.getSpecies({ includeDisabled: true }).sort()).deepEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(
      helper.getSpecies({ filtered: false, type: 'acidoBasic' }).sort(),
    ).deepEqual([]);
    expect(helper.getComponents().sort()).deepEqual(['D', 'E']);
    expect(
      helper.getComponents({ filtered: false, type: 'acidoBasic' }).sort(),
    ).deepEqual([]);
    expect(helper.getComponents({ includeDisabled: true }).sort()).deepEqual([
      'B',
      'D',
      'E',
    ]);
    expect(helper.getEquations().sort(equationSort)).deepEqual([
      { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 },
    ]);
    expect(
      helper.getEquations({ includeDisabled: true }).sort(equationSort),
    ).deepEqual([
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
    var model = helper.getModel();
    expect(getComponent('D', model)).deepEqual({ label: 'D', total: 2 });
    expect(getComponent('E', model)).deepEqual({ label: 'E', total: 1 });
    expect(getFormedSpecie('C', model)).deepEqual({
      label: 'C',
      components: getExpectedComponents(['D', 2, 'E', 1], model),
      beta: 10,
      solid: true,
    });

    helper.enableEquation('A');
    expect(helper.getSpecies().sort()).deepEqual(['A', 'B', 'C', 'D', 'E']);

    helper.disableEquation('A');
    helper.disableEquation('C');
    expect(helper.getSpecies()).deepEqual([]);
    helper.enableAllEquations();
    expect(helper.getSpecies().sort()).deepEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('should create a Helper when from multi-solvent database', () => {
    var helper = new Helper({ database: eq.multiSolvent });
    expect(helper.getSpecies().sort()).deepEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ]);
    helper = new Helper({ database: eq.multiSolvent, solvent: 'DMSO' });
    expect(helper.getSpecies().sort()).deepEqual([
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
    ]);
  });

  it('in water, it should create acid/base model just by adding one component', () => {
    var helper = new Helper({ database: eq.acidBase });
    helper.addSpecie('CH3COO-', 1);
    var model = helper.getModel();
    helper.getEquilibrium();
    expect(model.components).toHaveLength(2);
    expect(model.formedSpecies).toHaveLength(2);
  });

  it('should create a model where one component has a fixed concentration at equilibrium', () => {
    var helper = new Helper({ database: eq.equations1 });
    helper.addSpecie('A', 1);
    helper.addSpecie('C', 1);
    helper.addSpecie('B', 1);

    helper.addSpecie('X', 1); // should have no effect (specie not in database)
    helper.setAtEquilibrium('E', 2);
    helper.setAtEquilibrium('Y', 1); // should have no effect (specie not in database)
    var model = helper.getModel();
    expect(getComponent('B', model)).deepEqual({ label: 'B', total: 0 });
    expect(getComponent('D', model)).deepEqual({ label: 'D', total: 2 });
    expect(getComponent('E', model)).deepEqual({
      label: 'E',
      atEquilibrium: 2,
    });
    expect(getFormedSpecie('A', model)).deepEqual({
      label: 'A',
      beta: 10,
      components: getExpectedComponents(['B', -1], model),
      solid: false,
    });
    expect(getFormedSpecie('C', model)).deepEqual({
      label: 'C',
      beta: 10,
      components: getExpectedComponents(['D', 2, 'E', 1], model),
      solid: true,
    });
  });

  it('should create acid/base model', () => {
    var helper = new Helper({ database: eq.acidBase });
    helper.addSpecie('CO3--', 1);
    helper.addSpecie('HCO3-', 1);
    helper.addSpecie('OH-', 1);
    var model = helper.getModel();
    expect(model.components.length).toEqual(2);
    expect(model.formedSpecies.length).toEqual(3);

    expect(getComponent('CO3--', model)).deepEqual({
      label: 'CO3--',
      total: 2,
    });
    expect(getComponent('H+', model)).deepEqual({ label: 'H+', total: 0 });

    expect(getFormedSpecie('H2CO3', model)).deepEqual({
      label: 'H2CO3',
      beta: Math.pow(10, 10.33 + 6.3),
      components: getExpectedComponents(['CO3--', 1, 'H+', 2], model),
      solid: false,
    });

    expect(getFormedSpecie('HCO3-', model)).deepEqual({
      label: 'HCO3-',
      beta: Math.pow(10, 10.33),
      components: getExpectedComponents(['H+', 1, 'CO3--', 1], model),
      solid: false,
    });

    expect(getFormedSpecie('OH-', model)).deepEqual({
      label: 'OH-',
      beta: Math.pow(10, -14),
      components: getExpectedComponents(['H+', -1], model),
      solid: false,
    });
  });

  it('should create a very simple precipitation model (in DMSO)', () => {
    var helper = new Helper({ solvent: 'DMSO', database: eq.AgClInDMSO });
    helper.addSpecie('AgCl', 1);
    var model = helper.getModel();
    expect(model.components.length).toEqual(2);
    // A complex and a precipitate are formed
    expect(model.formedSpecies.length).toEqual(2);
    expect(getComponent('Ag+', model)).deepEqual({ label: 'Ag+', total: 1 });
    expect(getComponent('Cl-', model)).deepEqual({ label: 'Cl-', total: 1 });
    expect(getFormedSpecie('AgCl', model)).deepEqual({
      label: 'AgCl',
      beta: Math.pow(10, 9.74),
      components: getExpectedComponents(['Ag+', 1, 'Cl-', 1], model),
      solid: true,
    });
    expect(getFormedSpecie('AgCl2-', model)).deepEqual({
      label: 'AgCl2-',
      beta: Math.pow(10, 5.26),
      components: getExpectedComponents(['Ag+', 1, 'Cl-', 2], model),
      solid: false,
    });
  });

  it('should create precipitation model with OH- precipitation', () => {
    var helper = new Helper({ database: eq.AgInWater });
    helper.addSpecie('Ag+', 1);
    var model = helper.getModel();
    expect(model.components).toHaveLength(2);
    expect(model.formedSpecies).toHaveLength(2);
    expect(getComponent('Ag+', model)).deepEqual({ label: 'Ag+', total: 1 });
    expect(getComponent('H+', model)).deepEqual({ label: 'H+', total: 0 });
    expect(getFormedSpecie('AgOH', model)).deepEqual({
      label: 'AgOH',
      beta: Math.pow(10, 7.72 - 14),
      components: getExpectedComponents(['Ag+', 1, 'H+', -1], model),
      solid: true,
    });
  });
});

function getIndexes(labels, model) {
  var indexes = new Array(labels.length);
  for (var i = 0; i < labels.length; i++) {
    indexes[i] = model.components.findIndex((c) => c.label === labels[i]);
  }
  return indexes;
}

function getExpectedComponents(labels, model) {
  var l = [];
  var v = [];
  for (var i = 0; i < labels.length; i++) {
    if (i % 2 === 0) l.push(labels[i]);
    else v.push(labels[i]);
  }
  var indexes = getIndexes(l, model);

  var expected = new Array(model.components.length).fill(0);
  for (i = 0; i < indexes.length; i++) {
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
