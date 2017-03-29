'use strict';

const EquationSet = require('../../src/core/EquationSet');
const eq = require('./../data/equations');

describe('EquationSet', function () {
    it('should clone an equation set', function () {
        var eqSet = new EquationSet(eq.equations1);
        var newSet = eqSet.clone();
        [...newSet.keys()].should.deepEqual([...eqSet.keys()]);
    });

    it('should create and normalize an equation set (no inter-dependencies)', function () {
        var eqSet = new EquationSet(eq.equations1);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
    });

    it('should create and normalize an equation set (with inter-dependencies, example 1)', function () {
        var eqSet = new EquationSet(eq.equations2);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
        var A = norm.get('A', true);
        var B = norm.get('B', true);
        A.pK.should.equal(8);
        B.pK.should.equal(3);
    });

    it('should create and normalize an equation set (with inter-dependencies, example 2)', function () {
        var eqSet = new EquationSet(eq.equations3);
        var norm = eqSet.getNormalized('E');
        norm.size.should.equal(2);
        var A = norm.get('A', true);
        var B = norm.get('B', true);
        A.pK.should.equal(1);
        B.pK.should.equal(3);
    });

    it('should get a subset of an equation set', function () {
        var eqSet = new EquationSet(eq.equations4);
        var subSet = eqSet.getSubset(['C', 'D']);
        subSet.size.should.equal(2);
    });

    it('should get subset of an equation set', function () {
        var eqSet = new EquationSet(eq.equations2);
        var subSet = eqSet.getSubset(['A']);
        subSet.size.should.equal(2);
    });

    it('should get the model given the totals', function () {
        var eqSet = new EquationSet(eq.equations2);
        var normSet = eqSet.getNormalized('E');
        normSet.getModel({A: 1});
    });

    it('should throw when normalizing an equations set with a circular dependency', function () {
        var eqSet = new EquationSet(eq.circularEquations);
        (function () {
            eqSet.getNormalized();
        }).should.throw(/circular/);
    });
});
