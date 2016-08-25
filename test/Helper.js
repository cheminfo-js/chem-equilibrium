'use strict';
const Helper = require('../src/Helper');

describe('Helper', function () {
    it('should create acid/base model', function () {
        var helper = new Helper();
        helper.addAcidBase('CO3--', 1);
        helper.addAcidBase('HCO3-', 1);
        var model = helper.getModel();
        model.components.length.should.equal(2);
        model.formedSpecies.length.should.equal(3);
        var indexes = {'CO3--': model.components.findIndex(c => c.label === 'CO3--'), 'H+': model.components.findIndex(c => c.label === 'H+')};
        model.components.find(c => c.label === 'CO3--').should.deepEqual({label: 'CO3--', total: 2});
        model.components.find(c => c.label === 'H+').should.deepEqual({label: 'H+', total: 1});

        var comp = []; comp[indexes['CO3--']] = 1; comp[indexes['H+']] = 2; // 1 CO3--, 2h
        model.formedSpecies.find(s => s.label === 'H2CO3').should.deepEqual({label: 'H2CO3', beta: Math.pow(10, 10.33 + 6.3), components: comp});
        comp[indexes['H+']] = 1;
        model.formedSpecies.find(s => s.label === 'HCO3-').should.deepEqual({label: 'HCO3-', beta: Math.pow(10, 10.33), components: comp});
    });
});