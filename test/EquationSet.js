'use strict';

const EquationSet = require('../src/EquationSet');

const equations1 = [
    {
        formed: 'A',
        components: {
            B: -1
        },
        type: 'acidoBasic',
        pK: 1
    },
    {
        formed: 'C',
        components: {
            D: 2,
            E: 1
        },
        type: 'acidoBasic',
        pK: 1
    }
];

const equations2 = [
    {
        formed: 'A',
        components: {
            B: 2
        },
        type: 'acidoBasic',
        pK: 2
    },
    {
        formed: 'B',
        components: {
            C: 1,
            D: 1
        },
        type: 'acidoBasic',
        pK: 3
    }
];

describe.only('EquationSet', function () {
    it('should create an equation library (no inter-dependencies)', function () {
        var eqSet = new EquationSet(equations1);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
    });

    it.only('should create an equation library (with inter-dependencies', function () {
        var eqSet = new EquationSet(equations2);
        var norm = eqSet.getNormalized('E');
        norm.forEach(eq => {
            console.log(eq.pK);
        })
        norm.size.should.equal(2);
    });
});