import { Matrix } from 'ml-matrix';

import { logRandom } from '../util/logRandom';

import { newtonRaphton } from './NewtonRaphton';

const defaultOptions = {
  robustMaxTries: 10,
  volume: 1,
  random: Math.random,
  autoInitial: true,
  tolerance: 1e-15,
};

/**
 * Equilibrium
 */
export class Equilibrium {
  /**
   * @constructor
   * @param {object} model
   * amounts can be though as if they were concenrations.
   * @param {object[]} model.components - The equilibrium's independent components. Each object in the array requires
   * a label property and either a total property (for total amount) or an atEquilibrium property (for fixed final amount).
   * The label property should be a unique name for that specie
   *
   * @param {object[]} model.formedSpecies - The list of species that are formed from the components. Each object
   * in the array requires a label property, a beta property and a components property. The component property should be an array of numbers
   * with the stoechiometric coefficient of each component using the order in which the components where specified. The beta property
   * should be a number with the formation constant of this specie. The label property should be a unique name for that specie.
   *
   * @param {object} options - Additional options
   * @param {number} [options.volume=1] - Volume of the solution in which the equilibrium occurs. If this value is 1 then
   * @param {number} [options.robustMaxTries=15] - Maximum tries when using {@link #Equilibrium#solveRobust solveRobust}.
   * @param {function} [options.random=Math.random] - Random number generator to use when initializing concentrations
   */
  constructor(model, options) {
    this.options = { ...defaultOptions, ...options };
    checkModel(model);
    this.model = model;
    this._model = this._processModel(model);
  }

  /**
   * Get initial values of components. Initial values that are not set by the user are choosen randomly
   * @return {object} Object with two properties: solid with the initial solid "concentrations", component with
   * the initial non-fixed components
   * @private
   */
  _getInitial() {
    // Return random inital value for all labels that don't have a fixed initial value
    let keys = this._initial ? Object.keys(this._initial) : [];
    let initial = new Array(this._model.nComp);
    let initialSolid = new Array(this._model.specSolidLabels.length);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let idx = this._model.compLabels.indexOf(key);
      if (idx === -1) {
        idx = this._model.specSolidLabels.indexOf(key);
        if (idx !== -1) initialSolid[idx] = this._initial[key];
      } else {
        initial[idx] = this._initial[key];
      }
    }

    for (let i = 0; i < initial.length; i++) {
      if (initial[i] === undefined) {
        initial[i] = logRandom(this.options.random);
      }
    }

    for (let i = 0; i < initialSolid.length; i++) {
      if (initialSolid[i] === undefined) {
        initialSolid[i] = logRandom(this.options.random);
      }
    }

    return {
      components: initial,
      solids: initialSolid,
    };
  }

  /**
   * Process the model and get something readily usable by the optimization algorithm
   * @param {object} model
   * @return {{model: Array, beta: Array, cTotal: Array, cFixed: Array, specLabels: Array, compLabels: Array, fixedLabels: Array, nComp: (number|*), nSpec: (*|number), nFixed: number}}
   * @private
   */
  _processModel(model) {
    // change betas and model to reflect what should be
    // optimized in newton raphton
    // Initialize model
    let nFormed = model.formedSpecies.length;
    let nComp = model.components.length;
    let nSpec = nComp + nFormed;
    let nSpecSolution = count(model.formedSpecies, (spec) => !spec.solid);
    let nSpecSolid = nSpec - nSpecSolution - nComp;

    let formedSpeciesSolution = model.formedSpecies.filter(
      (spec) => !spec.solid,
    );
    let formedSpeciesSolid = model.formedSpecies.filter((spec) => spec.solid);

    // ========= init betas =====================================================================================
    // The formation constants for components is always 1
    let beta = new Matrix(1, nSpecSolution + nComp).fill(1);
    // The other formation constants we pick from user
    beta.setSubMatrix([formedSpeciesSolution.map((c) => c.beta)], 0, nComp);
    if (nSpecSolid) {
      var solidBeta = new Matrix([formedSpeciesSolid.map((c) => c.beta)]);
    }

    // =========== Init stoechiometric matrix (formed species in solution) =================================
    // One line per component, one column per specie
    // Species are components + formedSpecies

    let matrix = new Matrix(nComp, nSpecSolution + nComp);
    let identity = Matrix.identity(model.components.length);
    matrix.setSubMatrix(identity, 0, 0);

    // Now we modify the stoechiometric matrix if there are any components with fixed concentrations
    // Fixed components are removed from the model and beta values of species are updated accordingly
    let rows = [];
    for (let i = 0; i < nComp; i++) {
      for (let j = 0; j < nSpecSolution; j++) {
        matrix.set(i, j + nComp, formedSpeciesSolution[j].components[i]);
      }
    }

    for (let i = 0; i < nComp; i++) {
      // Fixed components have the atEquilibrium property set
      var atEq = model.components[i].atEquilibrium;
      if (!atEq) {
        // Keep this component in the final model
        rows.push(i);
      } else {
        // Update the beta value of all species
        // newBeta = oldBeta * fixedComponentConcentration^(stoechiometricCoefficient)
        const m = new Matrix(1, nSpecSolution + nComp).fill(atEq);
        m.pow([matrix.getRow(i)]);
        beta.multiply(m);
      }
    }

    // remove fixed components from beta and stoechiometric matrix
    let columns = rows.concat(getRange(nComp, nComp + nSpecSolution - 1));
    matrix = matrix.selection(rows, columns);
    beta = beta.selection([0], columns);
    // remove empty columns
    // var notZeroColumns = [];
    // loop1: for(var i=0; i<matrix.columns; i++) {
    //     for(var j=0; j<matrix.rows; j++) {
    //         if(matrix[j][i] !== 0) {
    //             notZeroColumns.push(i);
    //             continue loop1;
    //         }
    //     }
    // }
    // matrix = matrix.selection(getRange(0, matrix.rows - 1), notZeroColumns);
    // beta = beta.selection([0], notZeroColumns);

    // ============= Init stoechiometric matrix (formed solids) ================================================
    if (nSpecSolid) {
      rows = [];
      var solidMatrix = new Matrix(nComp, nSpecSolid);
      for (let i = 0; i < nComp; i++) {
        for (let j = 0; j < nSpecSolid; j++) {
          solidMatrix.set(i, j, formedSpeciesSolid[j].components[i]);
        }
      }

      for (let i = 0; i < nComp; i++) {
        // Fixed components have the atEquilibrium property set
        atEq = model.components[i].atEquilibrium;
        if (!atEq) {
          // Keep this component in the final model
          rows.push(i);
        } else {
          // Update the beta value of all species
          // newBeta = oldBeta * fixedComponentConcentration^(stoechiometricCoefficient)
          m = new Matrix(1, nSpecSolid).fill(atEq);
          m.pow([solidMatrix.getRow(i)]);
          solidBeta.multiply(m);
        }
      }

      // remove fixed components from beta and stoechiometric matrix
      columns = getRange(0, nSpecSolid - 1);
      solidMatrix = solidMatrix.selection(rows, columns);
      solidBeta = solidBeta.selection([0], columns);
      // newtonRaphton uses the dissociaton Ksp, not the formation Ksp
      solidBeta.pow(-1);
    }

    // ==========r=== Labels and concentrations ==================================================================
    let specLabels = [];
    let fixedLabels = [];
    let cFixed = [];
    let compLabels = [];

    // Init labels and total concentration
    let cTotal = [];
    for (let i = 0; i < nComp; i++) {
      let component = model.components[i];
      if (component.atEquilibrium) {
        // Keep concentration and label of fixed components
        fixedLabels.push(component.label);
        cFixed.push(component.atEquilibrium / this.options.volume);
      } else {
        // Total concentration of components that will be involved in the optimization algorithm
        cTotal.push(component.total / this.options.volume);
        specLabels.push(component.label);
        compLabels.push(component.label);
      }
    }

    let specSolutionLabels = formedSpeciesSolution.map((s) => s.label);
    let specSolidLabels = formedSpeciesSolid.map((s) => s.label);
    specLabels = specLabels.concat(specSolutionLabels, specSolidLabels);

    return {
      model: matrix.to2DArray(),
      beta: beta.to1DArray(),
      cTotal,
      cFixed,
      specLabels,
      compLabels,
      fixedLabels,
      specSolidLabels,
      specSolutionLabels,
      nFixed: nComp - matrix.rows,
      solidModel: solidMatrix && solidMatrix.to2DArray(),
      solidBeta: solidBeta && solidBeta.to1DArray(),
    };
  }

  /**
   * Solve the model. Initial concentrations set with {@link Equilibrium#setInitial setInitial} will be used as the
   * starting points of the optimization algorithm.
   * @return {object} An Object with as many properties as there are species. The key is the label of the specie,
   * and the value is the concentration at equilibrium of this specie.
   */
  solve() {
    let model = this._model;
    let initial = this._getInitial();
    let cSpec = newtonRaphton(
      model.model,
      model.beta,
      model.cTotal,
      initial.components,
      model.solidModel,
      model.solidBeta,
      initial.solids,
      this.options,
    );
    let result = this._processResult(cSpec);
    if (this.options.autoInitial) this.setInitial(result);
    return result;
  }

  /**
   * Solve the model robustly. Does not take into account initial concentrations set with {@link #Equilibrium#setInitial setInitial}
   * Random initialization concentrations are used until the optimization algorithm converges. The number of tries
   * is set at instanciation with robustMaxTries
   * @return {object|null} An Object with as many properties as there are species. The key is the label of the specie,
   * and the value is the concentration at equilibrium of this specie.
   */
  solveRobust() {
    let model = this._model;
    for (let i = 0; i < this.options.robustMaxTries; i++) {
      let initial = {
        components: logRandom.logarithmic(
          this.options.random,
          model.compLabels.length,
        ),
        solids: logRandom.logarithmic(
          this.options.random,
          model.specSolidLabels.length,
        ),
      };
      let cSpec = newtonRaphton(
        model.model,
        model.beta,
        model.cTotal,
        initial.components,
        model.solidModel,
        model.solidBeta,
        initial.solids,
        this.options,
      );
      if (cSpec) {
        return this._processResult(cSpec);
      }
    }

    return null;
  }

  /**
   * Set initial concentration of components
   * @param {object} init - Object where the key is the label of the component and the value is the initial
   * amount (in moles) of this components.
   */
  setInitial(init) {
    let initial = { ...init };
    let keys = Object.keys(initial);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (initial[key] === 0) initial[key] = 1e-15;
    }
    this._initial = initial;
  }

  /**
   * Transforms array of specie concentrations into object where the key is the specie label.
   * Adds the fixed concentrations to it
   * @param {Array} cSpec - Array of specie concentrations
   * @return {object} Object where key is the specie label and value is the concentration
   * @private
   */
  _processResult(cSpec) {
    if (!cSpec) return null;
    let result = {};
    for (let i = 0; i < this._model.specLabels.length; i++) {
      result[this._model.specLabels[i]] = cSpec[i];
    }

    for (let i = 0; i < this._model.cFixed.length; i++) {
      result[this._model.fixedLabels[i]] = this._model.cFixed[i];
    }

    return result;
  }
}

function getRange(start, end) {
  let arr = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
}

function checkModel(model) {
  // check that labels are unique
  let labels = {};
  checkLabels(model.formedSpecies, labels);
  checkLabels(model.components, labels);
  checkComponents(model.components);
  checkFormedSpecies(model);
}

function checkLabels(arr, labels) {
  for (let i = 0; i < arr.length; i++) {
    let label = arr[i].label;
    if (label === undefined || label === null) {
      throw new Error('Labels must be defined');
    }
    if (labels[label]) throw new Error('Labels should be unique');
    labels[label] = true;
  }
}

function checkComponents(comp) {
  for (let i = 0; i < comp.length; i++) {
    if (
      typeof comp[i].total !== 'number' &&
      typeof comp[i].atEquilibrium !== 'number'
    ) {
      throw new Error(
        'Component should have a property total or atEquilibrium that is a number',
      );
    }
  }
}

function checkFormedSpecies(model) {
  let spec = model.formedSpecies;
  if (!spec) throw new Error('Formed species is not defined');
  for (let i = 0; i < spec.length; i++) {
    let s = spec[i];
    if (!s.components || s.components.length !== model.components.length) {
      throw new Error(
        "Formed species' components array should have the same size as components",
      );
    }
    if (typeof s.beta !== 'number') {
      throw new Error('All formed species should have a beta property');
    }
  }
}

function count(arr, cb) {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (cb(arr[i])) ++count;
  }
  return count;
}
