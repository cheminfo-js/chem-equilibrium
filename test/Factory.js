'use strict';
const Factory = require('../src/Factory');
const eq = require('./data/equations');

describe('Factory', function () {
    it('should test various getters', function () {
        var factory = new Factory({database: eq.equations1});
        factory.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);
        factory.getSpecies(false, 'acidoBasic').sort().should.deepEqual(['A', 'B']);
        factory.getComponents().sort().should.deepEqual(['B', 'D', 'E']);
        factory.getComponents(false, 'acidoBasic').sort().should.deepEqual(['B']);
        factory.getEquations().sort(equationSort).should.deepEqual([
            { formed: 'A', components: { B: -1 }, type: 'acidoBasic', pK: 1 },
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );
        factory.addSpecie('D', 1);
        factory.getSpecies(true).should.deepEqual(['D']);
        factory.getComponents(true).should.deepEqual(['D']);
        factory.getEquations(true).sort(equationSort).should.deepEqual([]);
        factory.addSpecie('C', 1);
        factory.getSpecies(true).sort().should.deepEqual(['C', 'D', 'E']);
        factory.getComponents(true).sort().should.deepEqual(['D', 'E']);
        factory.getEquations(true).sort(equationSort).should.deepEqual([
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );

        // Test getters when there is inter-dependency
        factory = new Factory({database: eq.acidBase});
        factory.addSpecie('HPO4--', 1);
        factory.getComponents(true).sort().should.deepEqual(['H+', 'PO4---']);
    });

    it('should enable/disable equations', function () {
        var factory = new Factory({database: eq.equations1});
        factory.disableEquation('A');
        factory.getSpecies().sort().should.deepEqual(['C', 'D', 'E']);
        factory.getSpecies(false, 'acidoBasic').sort().should.deepEqual([]);
        factory.getComponents().sort().should.deepEqual(['D', 'E']);
        factory.getComponents(false, 'acidoBasic').sort().should.deepEqual([]);
        factory.getEquations().sort(equationSort).should.deepEqual([
            { formed: 'C', components: { D: 2, E: 1 }, type: 'precipitation', pK: 1 } ]
        );
        factory.addSpecie('A', 1);
        factory.addSpecie('C', 1);
        var model = factory.getModel();
        getComponent('D', model).should.deepEqual({label: 'D', total: 2});
        getComponent('E', model).should.deepEqual({label: 'E', total: 1});
        getFormedSpecie('C', model).should.deepEqual({
            label: 'C',
            components: getExpectedComponents(['D', 2, 'E', 1], model),
            beta: 0.1,
            solid: true
        });

        factory.enableEquation('A');
        factory.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E']);
    });
    it('should create a Factory when from multi-solvent database', function () {
        var factory = new Factory({database: eq.multiSolvent});
        factory.getSpecies().sort().should.deepEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        factory = new Factory({database: eq.multiSolvent, solvent: 'DMSO'});
        factory.getSpecies().sort().should.deepEqual(['D', 'E', 'F', 'G', 'H', 'I']);
    });

    it('in water, it should create acid/base model just by adding one component', function () {
        var factory = new Factory({database: eq.acidBase});
        factory.addSpecie('CH3COO-', 1);
        var model = factory.getModel();
        factory.getEquilibrium();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
    });


    it('should create a model where one component has a fixed concentration at equilibrium', function () {
        var factory = new Factory({database: eq.equations1});
        factory.addSpecie('A', 1);
        factory.addSpecie('C', 1);
        factory.addSpecie('B', 1);

        factory.addSpecie('X', 1); // should have no effect (specie not in database)
        factory.setAtEquilibrium('E', 2);
        factory.setAtEquilibrium('Y', 1); // should have no effect (specie not in database)
        var model = factory.getModel();
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
            beta: 0.1,
            components: getExpectedComponents(['D', 2, 'E', 1], model),
            solid: true
        });
    });

    it('should create acid/base model', function () {
        var factory = new Factory({database: eq.acidBase});
        factory.addSpecie('CO3--', 1);
        factory.addSpecie('HCO3-', 1);
        factory.addSpecie('OH-', 1);
        var model = factory.getModel();
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
        var factory = new Factory({solvent: 'DMSO', database: eq.AgClInDMSO});
        factory.addSpecie('AgCl', 1);
        var model = factory.getModel();
        model.components.length.should.equal(2);
        // A complex and a precipitate are formed
        model.formedSpecies.length.should.equal(2);
        getComponent('Ag+', model).should.deepEqual({label: 'Ag+', total: 1});
        getComponent('Cl-', model).should.deepEqual({label: 'Cl-', total: 1});
        getFormedSpecie('AgCl', model).should.deepEqual({
            label: 'AgCl',
            beta: Math.pow(10, -9.74),
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
        var factory = new Factory({database: eq.AgInWater});
        factory.addSpecie('Ag+', 1);
        var model = factory.getModel();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
        getComponent('Ag+', model).should.deepEqual({label: 'Ag+', total: 1});
        getComponent('H+', model).should.deepEqual({label: 'H+', total: 0});
        getFormedSpecie('AgOH', model).should.deepEqual({
            label: 'AgOH',
            beta: Math.pow(10, -7.72 + 14),
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