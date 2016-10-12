'use strict';

const Helper = require('../../src/helpers/Helper');
const Serie = require('../../src/helpers/Serie');
const eq = require('../data/equations');
describe('Serie', function () {
    it('should create a chart', function () {
        var helper = new Helper({database: eq.equations2});
        helper.addSpecie('A', 0.1);
        var serie = new Serie(helper);

        var chart = serie.getChart({
            chunks: 3,
            varying: 'D'
        });

        console.log(JSON.stringify(chart, null, '\t'));
    });
});