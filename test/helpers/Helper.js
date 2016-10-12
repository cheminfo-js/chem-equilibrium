'use strict';
const Helper = require('../../src/helpers/Helper');
const eq = require('./../data/equations');

describe('Helper', function () {
    it('should test various getters', function () {
        var helper = new Helper({database: eq.equations1});
        helper.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);
        helper.getSpecies({filtered: false, type: 'acidoBasic'}).sort().should.deepEqual(['A', 'B']);
        helper.getComponents().sort().should.deepEqual(['B', 'D', 'E']);
        helper.getComponents({filtered: false, type: 'acidoBasic'}).sort().should.deepEqual(['B']);
        helper.getEquations().sort(equationSort).should.deepEqual([
            { formed: 'A', components: { B: -1 }, type: 'acidoBasic', pK: 1 },
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );

        helper.addSpecie('D', 1);
        helper.getSpecies({filtered: true}).should.deepEqual(['D']);
        // getComponents only returns components when they form an equation
        helper.getComponents({filtered: true}).should.deepEqual([]);
        helper.getEquations({filtered: true}).sort(equationSort).should.deepEqual([]);
        helper.addSpecie('C', 1);
        helper.getSpecies({filtered: true}).sort().should.deepEqual(['C', 'D', 'E']);
        helper.getComponents({filtered: true}).sort().should.deepEqual(['D', 'E']);
        helper.getEquations({filtered: true}).sort(equationSort).should.deepEqual([
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );
        helper.resetSpecies();
        helper.getSpecies({filtered: true}).should.deepEqual([]);
        helper.getComponents({filtered: true}).should.deepEqual([]);
        helper.getEquations({filtered: true}).should.deepEqual([]);

        // Test getters when there is inter-dependency
        helper = new Helper({database: eq.acidBase});
        helper.addSpecie('HPO4--', 1);
        helper.getComponents({filtered: true}).sort().should.deepEqual(['H+', 'PO4---']);

        helper = new Helper();
        helper.addSpecie('CH3COO-', 1);

    });

    it('should enable/disable equations', function () {
        var helper = new Helper({database: eq.equations1});
        helper.disableEquation('A');
        helper.getSpecies().sort().should.deepEqual(['C', 'D', 'E']);
        helper.getSpecies({includeDisabled: true}).sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);
        helper.getSpecies({filtered: false, type: 'acidoBasic'}).sort().should.deepEqual([]);
        helper.getComponents().sort().should.deepEqual(['D', 'E']);
        helper.getComponents({filtered: false, type: 'acidoBasic'}).sort().should.deepEqual([]);
        helper.getComponents({includeDisabled:true}).sort().should.deepEqual(['B', 'D', 'E']);
        helper.getEquations().sort(equationSort).should.deepEqual([
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );
        helper.getEquations({includeDisabled: true}).sort(equationSort).should.deepEqual([
            { formed: 'A', components: {B: -1}, type: 'acidoBasic', pK: 1, disabled: true},
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 }
        ]);
        helper.addSpecie('A', 1);
        helper.addSpecie('C', 1);
        var model = helper.getModel();
        getComponent('D', model).should.deepEqual({label: 'D', total: 2});
        getComponent('E', model).should.deepEqual({label: 'E', total: 1});
        getFormedSpecie('C', model).should.deepEqual({
            label: 'C',
            components: getExpectedComponents(['D', 2, 'E', 1], model),
            beta: 10,
            solid: true
        });

        helper.enableEquation('A');
        helper.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);

        helper.disableEquation('A');
        helper.disableEquation('C');
        helper.getSpecies().should.deepEqual([]);
        helper.enableAllEquations();
        helper.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);
    });
    it('should create a Helper when from multi-solvent database', function () {
        var helper = new Helper({database: eq.multiSolvent});
        helper.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        helper = new Helper({database: eq.multiSolvent, solvent: 'DMSO'});
        helper.getSpecies().sort().should.deepEqual(['D', 'E', 'F', 'G', 'H', 'I']);
    });

    it('in water, it should create acid/base model just by adding one component', function () {
        var helper = new Helper({database: eq.acidBase});
        helper.addSpecie('CH3COO-', 1);
        var model = helper.getModel();
        helper.getEquilibrium();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
    });


    it('should create a model where one component has a fixed concentration at equilibrium', function () {
        var helper = new Helper({database: eq.equations1});
        helper.addSpecie('A', 1);
        helper.addSpecie('C', 1);
        helper.addSpecie('B', 1);

        helper.addSpecie('X', 1); // should have no effect (specie not in database)
        helper.setAtEquilibrium('E', 2);
        helper.setAtEquilibrium('Y', 1); // should have no effect (specie not in database)
        var model = helper.getModel();
        getComponent('B', model).should.deepEqual({label: 'B', total: 0});
        getComponent('D', model).should.deepEqual({label: 'D', total: 2});
        getComponent('E', model).should.deepEqual({label: 'E', atEquilibrium: 2});
        getFormedSpecie('A', model).should.deepEqual({
            label: 'A',
            beta: 10,
            components: getExpectedComponents(['B', -1], model),
            solid: false
        });
        getFormedSpecie('C', model).should.deepEqual({
            label: 'C',
            beta: 10,
            components: getExpectedComponents(['D', 2, 'E', 1], model),
            solid: true
        });
    });

    it('should create acid/base model', function () {
        var helper = new Helper({database: eq.acidBase});
        helper.addSpecie('CO3--', 1);
        helper.addSpecie('HCO3-', 1);
        helper.addSpecie('OH-', 1);
        var model = helper.getModel();
        model.components.length.should.equal(2);
        model.formedSpecies.length.should.equal(3);

        getComponent('CO3--', model).should.deepEqual({label: 'CO3--', total: 2});
        getComponent('H+', model).should.deepEqual({label: 'H+', total: 0});


        getFormedSpecie('H2CO3', model).should.deepEqual({
            label: 'H2CO3',
            beta: Math.pow(10, 10.33 + 6.3),
            components: getExpectedComponents(['CO3--', 1, 'H+', 2], model),
            solid: false
        });

        getFormedSpecie('HCO3-', model).should.deepEqual({
            label: 'HCO3-',
            beta: Math.pow(10, 10.33),
            components: getExpectedComponents(['H+', 1, 'CO3--', 1], model),
            solid: false
        });

        getFormedSpecie('OH-', model).should.deepEqual({
            label: 'OH-',
            beta: Math.pow(10, -14),
            components: getExpectedComponents(['H+', -1], model),
            solid: false
        });
    });

    it('should create a very simple precipitation model (in DMSO)', function () {
        var helper = new Helper({solvent: 'DMSO', database: eq.AgClInDMSO});
        helper.addSpecie('AgCl', 1);
        var model = helper.getModel();
        model.components.length.should.equal(2);
        // A complex and a precipitate are formed
        model.formedSpecies.length.should.equal(2);
        getComponent('Ag+', model).should.deepEqual({label: 'Ag+', total: 1});
        getComponent('Cl-', model).should.deepEqual({label: 'Cl-', total: 1});
        getFormedSpecie('AgCl', model).should.deepEqual({
            label: 'AgCl',
            beta: Math.pow(10, 9.74),
            components: getExpectedComponents(['Ag+', 1, 'Cl-', 1], model),
            solid: true
        });
        getFormedSpecie('AgCl2-', model).should.deepEqual({
            label: 'AgCl2-',
            beta: Math.pow(10, 5.26),
            components: getExpectedComponents(['Ag+', 1, 'Cl-', 2], model),
            solid: false
        });
    });

    it('should create precipitation model with OH- precipitation', function () {
        var helper = new Helper({database: eq.AgInWater});
        helper.addSpecie('Ag+', 1);
        var model = helper.getModel();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
        getComponent('Ag+', model).should.deepEqual({label: 'Ag+', total: 1});
        getComponent('H+', model).should.deepEqual({label: 'H+', total: 0});
        getFormedSpecie('AgOH', model).should.deepEqual({
            label: 'AgOH',
            beta: Math.pow(10, 7.72 - 14),
            components: getExpectedComponents(['Ag+', 1, 'H+', -1], model),
            solid: true
        })
    })
});

function getIndexes(labels, model) {
    var indexes = new Array(labels.length);
    for (var i = 0; i < labels.length; i++) {
        indexes[i] = model.components.findIndex(c => c.label === labels[i]);
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
    return model.formedSpecies.find(s => s.label === label)
}

function getComponent(label, model) {
    return model.components.find(c => c.label === label);
}

function equationSort(a, b) {
    if(a.formed < b.formed) return -1;
    else if(a.formed > b.formed) return 1;
    return 0;
}