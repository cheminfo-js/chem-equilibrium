'use strict';

const EquationSet = require('../src/EquationSet');

var equations1 = [
    {
        formed: 'A',
        components: {
            B: -1
        },
        type: 'acidoBasic'
    },
    {
        formed: 'C',
        components: {
            D: 2,
            E: 1
        },
        type: 'acidoBasic'
    }
];

describe.only('EquationSet', function () {
    it('should create an equation library', function () {
        var eqSet = new EquationSet(equations1);
        var norm = eqSet.getNormalized('E');
        console.log(norm);
    });
});