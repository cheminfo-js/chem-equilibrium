'use strict';
const Factory = require('../src/Factory');

describe('Factory', function () {
    it('in water, it should create acid/base model just by adding one component', function () {
        var factory = new Factory();
        factory.addSpecie('CH3COO-', 1);
        var model = factory.getModel();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
    });

    it('should create acid/base model', function () {
        var factory = new Factory();
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
            components: getExpectedComponents(['CO3--', 1, 'H+', 2], model)
        });

        getFormedSpecie('HCO3-', model).should.deepEqual({
            label: 'HCO3-',
            beta: Math.pow(10, 10.33),
            components: getExpectedComponents(['H+', 1, 'CO3--', 1], model)
        });

        getFormedSpecie('OH-', model).should.deepEqual({
            label: 'OH-',
            beta: Math.pow(10, -14),
            components: getExpectedComponents(['H+', -1], model)
        });
    });

    it('should create a very simple precipitation model (in DMSO)', function () {
        var factory = new Factory({solvent: 'DMSO'});
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
            components: getExpectedComponents(['Ag+', 1, 'Cl-', 2], model)
        });
    });

    it.only('should create precipitation model with OH- precipitation', function () {
        var factory = new Factory();
        factory.addSpecie('Ag+', 1);
        var model = factory.getModel();
        model.components.should.have.length(2);
        model.formedSpecies.should.have.length(2);
        getComponent('Ag+', model).should.deepEqual({label: 'Ag+', total: 1});
        getComponent('H+', model).should.deepEqual({label: 'H+', total: 0});
        getFormedSpecie('AgOH', model).should.deepEqual({
            label: 'AgOH',
            beta: Math.pow(10, -7.72),
            components: getExpectedComponents(['Ag+', 1, 'H+', -1], model)
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