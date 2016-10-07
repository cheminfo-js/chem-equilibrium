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

const equations3 = [
    {
        formed: 'A',
        components: {
            B: 1,
            C: 1
        },
        pK: -2,
        type: 'acidoBasic'
    },
    {
        formed: 'B',
        components: {
            D: 1
        },
        pK: 3,
        type: 'acidoBasic'
    }
];

describe('EquationSet', function () {
    it('should create and normalize an equation set (no inter-dependencies)', function () {
        var eqSet = new EquationSet(equations1);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
    });

    it('should create and normalize an equation set (with inter-dependencies, example 1)', function () {
        var eqSet = new EquationSet(equations2);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
        var A = norm.get('A', true);
        var B = norm.get('B', true);
        A.pK.should.equal(8);
        B.pK.should.equal(3);
    });

    it('should create and normalize an equation set (with inter-dependencies, example 2)', function () {
        var eqSet = new EquationSet(equations3);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
        var A = norm.get('A', true);
        var B = norm.get('B', true);
        A.pK.should.equal(1);
        B.pK.should.equal(3);
    });

    it('should get a subset of an equation set', function () {
        var eqSet = new EquationSet(equations2);
        var subSet = eqSet.getSubset(['C', 'D']);
        subSet.size.should.equal(2);
    });


});