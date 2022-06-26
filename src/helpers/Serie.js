const defaultOptions = {
  chunks: 200,
  log: false,
  from: 0,
  to: 1,
  isFixed: false,
};

export class Serie {
  constructor(helper) {
    this.helper = helper;
  }

  getTitration(options) {
    options = { ...defaultOptions, ...options };
    // We don't want to change the original helper
    let helper = this.helper.clone();
    helper.resetSpecies();
    // Some options are meant for the helper
    // e.g. tolerance, solidTolerance, maxIterations
    helper.setOptions(options);

    let solVolume = options.solution.volume;
    let solConc = options.solution.concentration;
    let solQty = solConc * solVolume;

    let titrConc = options.titrationSolution.concentration;
    let titrVolStart = 0;
    let titrVolStop = options.titrationSolution.volume;

    let errorCount = 0;

    let vols = [];
    let ph = [];
    let solutions = [];
    let chunks = options.chunks;
    let sol;

    helper.addSpecie(options.solution.type);
    helper.addSpecie(options.titrationSolution.type);

    for (let i = 0; i <= chunks; i++) {
      let vol = titrVolStart + (titrVolStop - titrVolStart) * (i / chunks);
      let totalVol = vol + solVolume;
      let titrQty = vol * titrConc;
      helper.setTotal(options.titrationSolution.type, titrQty);
      helper.setTotal(options.solution.type, solQty);
      helper.setOptions({ volume: totalVol });
      let eq = helper.getEquilibrium();

      if (!sol) {
        sol = eq.solveRobust();
      } else {
        eq.setInitial(sol);
        sol = eq.solve();
      }

      if (sol) {
        ph.push(-Math.log10(sol['H+']));
        solutions.push(sol);
        vols.push(vol);
      } else {
        errorCount++;
      }
    }

    let xy = [];
    for (let i = 0; i < ph.length; i++) {
      xy.push(vols[i], ph[i]);
    }

    let species = solutions[0] ? Object.keys(solutions[0]) : [];

    return {
      xy,
      errorCount,
      solutions,
      species,
      volumes: vols,
      equations: helper.getEquations({ filtered: true }),
    };
  }

  getSolutions(options) {
    options = { ...defaultOptions, ...options };
    // We don't want to change the original helper
    let helper = this.helper.clone();
    // Some options are meant for the helper
    // e.g. tolerance, solidTolerance, maxIterations
    helper.setOptions(options);

    checkOptions(options);
    let varying = options.varying;

    // if(options.log) {
    //     var [from, to] = [Math.pow(10, -options.to), Math.pow(10, -options.from)];
    // } else {
    //     [from, to] = [options.from, options.to];
    // }

    let errorCount = 0;
    let chunks = options.chunks;
    let sol;
    let solutions = [];
    let x = [];
    let log = options.log;
    let from = options.from;
    let to = options.to;

    // if(log) {
    //     from = -Math.log10(Number(options.to));
    //     to = -Math.log10(Number(options.from));
    // } else {
    //     from = Number(options.from);
    //     to = Number(options.to);
    // }

    for (let i = 0; i <= chunks; i++) {
      let val = options.from + ((to - from) * i) / chunks;

      if (log) {
        var realVal = Math.pow(10, -val);
      } else {
        realVal = val;
      }
      if (options.isFixed) {
        helper.setAtEquilibrium(varying, realVal);
      } else {
        helper.setTotal(varying, realVal);
      }
      let eq = helper.getEquilibrium();
      if (sol) {
        eq.setInitial(sol);
        sol = eq.solve();
      } else {
        sol = eq.solveRobust();
      }
      if (sol) {
        x.push(val);
        solutions.push(sol);
      } else {
        errorCount++;
      }
    }
    return {
      x,
      solutions,
      errorCount,
      species: solutions[0] ? Object.keys(solutions[0]) : [],
    };
  }
}

function checkOptions(options) {
  if (options.from >= options.to) {
    throw new Error(
      'Invalid arguments: property "to" should be larger than "from"',
    );
  }

  if (!options.varying) {
    throw new Error('Invalid arguments: property "varying" is not defined');
  }
}
