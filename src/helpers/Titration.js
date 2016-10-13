'use strict';

'use strict';

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

    getTitration(options) {
        var form = get('form');
        var solComp = form.solution.type;
        var solVolume = form.solution.volume;
        var solConc = form.solution.concentration;
        var solQty = solConc * solVolume;

        var titrConc = form.titrationSolution.concentration;
        var titrVolStart = 0;
        var titrVolStop = form.titrationSolution.volume;

        var errorCount = 0;

        var vols = [];
        var ph = [];
        var chunks = 500;
        var sol;
        var acidModel = new Factory();

        for(var i=0; i<=chunks; i++) {
            var vol = titrVolStart + (titrVolStop - titrVolStart) * (i/chunks)
            var totalVol = vol + solVolume;
            var titrQty = vol * titrConc;
            acidModel.reset();
            acidModel.addSpecie(form.titrationSolution.type, titrQty);
            acidModel.addSpecie(form.solution.type, solQty);
            acidModel.setOptions({volume: totalVol});
            var eq = acidModel.getEquilibrium();

            if(!sol) {
                sol = eq.solveRobust();
            } else {
                eq.setInitial(sol);
                sol = eq.solve();
            }

            if(sol) {
                ph.push(-Math.log10(sol['H+']));
            } else {
                ph.push(NaN);
                errorCount++;
            }

            vols.push(vol);
        }

        var xy = [];
        for(var i=0; i<ph.length; i++) {
            if(isNaN(ph[i])) continue;
            xy.push(vols[i], ph[i]);
        }
        API.createData('xy', xy);
        API.createData('errorCount', errorCount);

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