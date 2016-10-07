'use strict';

const Equation = require('../src/Equation');
const eqA = new Equation({
    formed: 'A',
    components: {
        B: 1,
        C: 1
    },
    pK: 1,
    type: 'acidoBasic'
});

describe('Equation', function () {
    it('solvent is the formed specie', function () {
        var eq = eqA.withSolvent('A');
        eq.formed.should.equal('C');
        eq.components.should.deepEqual({B: -1});
        eq.pK.should.equal(-1);
        eq.type.should.equal('acidoBasic');
    });

    it('solvent is a component', function () {
        var eq = eqA.withSolvent('B');
        eq.formed.should.equal('A');
        eq.components.should.deepEqual({C: 1});
        eq.pK.should.equal(1);
        eq.type.should.equal('acidoBasic');
    });

    it('solvent is not in the equation', function () {
        var eq = eqA.withSolvent('D');
        eq.formed.should.equal('A');
        eq.components.should.deepEqual({B:1, C:1});
        eq.pK.should.equal(1);
        eq.type.should.equal('acidoBasic');
    });
});