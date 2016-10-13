'use strict';

const getChart = require('../util/chart');
const defaultOptions = {
    chunks: 200,
    log: false,
    from: 0,
    to: 1,
    isFixed: false
};

class Serie {
    constructor(helper) {
        this.helper = helper;
    }

    getSolutions(options) {
        options = Object.assign({}, defaultOptions, options);
        // We don't want to change the original helper
        var helper = this.helper.clone();
        // Some options are meant for the helper
        // e.g. tolerance, solidTolerance, maxIterations
        helper.setOptions(options);

        checkOptions(options);
        var varying = options.varying;

        // if(options.log) {
        //     var [from, to] = [Math.pow(10, -options.to), Math.pow(10, -options.from)];
        // } else {
        //     [from, to] = [options.from, options.to];
        // }


        var errorCount = 0;
        var chunks = options.chunks;
        var sol;
        var solutions = [];
        var x = [];
        var log = options.log;
        var from = options.from;
        var to = options.to;

        // if(log) {
        //     from = -Math.log10(Number(options.to));
        //     to = -Math.log10(Number(options.from));
        // } else {
        //     from = Number(options.from);
        //     to = Number(options.to);
        // }

        for(var i=0; i<=chunks; i++) {
            var val = options.from + (to - from) * i / chunks;

            if(log) {
                var realVal = Math.pow(10, -val);
            } else {
                realVal = val;
            }
            if(options.isFixed) {
                helper.setAtEquilibrium(varying, realVal);
            } else {
                helper.setTotal(varying, realVal);
            }
            var eq = helper.getEquilibrium();
            if(sol) {
                eq.setInitial(sol);
                sol = eq.solve();
            } else {
                sol = eq.solveRobust();
            }
            if(sol) {
                x.push(val);
                solutions.push(sol);
            } else {
                errorCount++;
            }
        }
        return {
            x, solutions, errorCount,
            species: solutions[0] ? Object.keys(solutions[0]) : []
        }
    }

    getChart(options) {
        var sol = this.getSolutions(options);
        var chart = getChart(sol.x, sol.solutions, {
            xLabel: options.isFixed ? ('Quantity ' + (log ? '-log10 of ' : 'of ') + options.varying + 'at equilibrium ' + log ? '' : '[mol]') : ('Total quantity of ' + options.varying),
            yLabel: 'Amount of other species at equilibrium [mol]'
        });

        return {
            chart,
            errorCount: sol.errorCount,
            species: sol.species
        }
    }
}

function checkOptions(options) {
    if(options.from >= options.to) {
        throw new Error('Invalid arguments: property "to" should be larger than "from"');
    }

    if(!options.varying) {
        throw new Error('Invalid arguments: property "varying" is not defined');
    }
}

module.exports = Serie;