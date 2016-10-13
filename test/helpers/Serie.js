'use strict';

const Helper = require('../../src/helpers/Helper');
const Serie = require('../../src/helpers/Serie');
const eq = require('../data/equations');
describe('Serie', function () {
    it('should create a chart', function () {
        var helper = new Helper({database: eq.acidBase});
        helper.addSpecie('PO4---', 1);

        // console.log(JSON.stringify(helper.getModel(), null, '\t'));
        var serie = new Serie(helper);

        var chart = serie.getChart({
            chunks: 3,
            varying: 'H+'
        });


        chart.chart.data.length.should.equal(6);

        //console.log(JSON.stringify(chart, null, '\t'));
    });
});