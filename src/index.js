'use strict';
const Matrix = require('ml-matrix');
const random = require('./util/random');
const newtonRaphton = require('./NewtonRaphton');

const defaultOptions = {
    robustMaxTries: 15,
    volume: 1,
    random: Math.random
};

/**
 * Equilibrium
 */
class Equilibrium {
    /**
     * @constructor
     * @param {Object} model
     * amounts can be though as if they were concenrations.
     * @param {Object[]} model.components - The equilibrium's independent components. Each object in the array requires
     * a label property and either a total property (for total amount) or an atEquilibrium property (for fixed final amount).
     * The label property should be a unique name for that specie
     *
     * @param {Object[]} model.formedSpecies - The list of species that are formed from the components. Each object
     * in the array requires a label property, a beta property and a components property. The component property should be an array of numbers
     * with the stoechiometric coefficient of each component using the order in which the components where specified. The beta property
     * should be a number with the formation constant of this specie. The label property should be a unique name for that specie.
     *
     * @param {Object} options - Additional options
     * @param {number} [options.volume=1] - Volume of the solution in which the equilibrium occurs. If this value is 1 then
     * @param {number} [options.robustMaxTries=15] - Maximum tries when using {@link #Equilibrium#solveRobust solveRobust}.
     * @param {function} [options.random=Math.random] - Random number generator to use when initializing concentrations
     */
    constructor(model, options) {
        this.options = Object.assign({}, defaultOptions, options);
        checkModel(model);
        this.model = model;
        this._model = this._processModel(model);
    }

    /**
     * Get initial values of components. Initial values that are not set by the user are choosen randomly
     * @returns {Object} Object with two properties: solid with the initial solid "concentrations", component with
     * the initial non-fixed components
     * @private
     */
    _getInitial() {
        // Return random inital value for all labels that don't have a fixed initial value
        var keys = this._initial ? Object.keys(this._initial) : [];
        var initial = new Array(this._model.nComp);
        var initialSolid = new Array(this._model.specSolidLabels.length);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var idx = this._model.compLabels.indexOf(key);
            if (idx === -1) {
                idx = this._model.specSolidLabels.indexOf(key);
                if(idx !== -1) initialSolid[idx] = this._initial[key];
            } else {
                initial[idx] = this._initial[key];
            }
        }

        for (i = 0; i < initial.length; i++) {
            if (initial[i] === undefined) {
                initial[i] = random.logarithmic(this.options.random);
            }
        }

        for(i = 0; i<initialSolid.length; i++) {
            if(initialSolid[i] === undefined) {
                initialSolid[i] = random.logarithmic(this.options.random);
            }
        }

        return {
            components: initial,
            solids: initialSolid
        };
    }

    /**
     * Process the model and get something readily usable by the optimization algorithm
     * @param model
     * @returns {{model: Array, beta: Array, cTotal: Array, cFixed: Array, specLabels: Array, compLabels: Array, fixedLabels: Array, nComp: (number|*), nSpec: (*|number), nFixed: number}}
     * @private
     */
    _processModel(model) {
        // change betas and model to reflect what should be
        // optimized in newton raphton
        // Initialize model
        var nFormed = model.formedSpecies.length;
        var nComp = model.components.length;
        var nSpec = nComp + nFormed;
        var nSpecSolution = count(model.formedSpecies, spec => !spec.solid);
        var nSpecSolid = nSpec - nSpecSolution - nComp;

        var formedSpeciesSolution = model.formedSpecies.filter(spec => !spec.solid);
        var formedSpeciesSolid = model.formedSpecies.filter(spec => spec.solid);

        // ========= init betas =====================================================================================
        // The formation constants for components is always 1
        var beta = new Matrix(1, nSpecSolution + nComp).fill(1);
        // The other formation constants we pick from user
        beta.setSubMatrix([formedSpeciesSolution.map(c => c.beta)], 0, nComp);
        if(nSpecSolid) {
            var solidBeta = new Matrix([formedSpeciesSolid.map(c => c.beta)]);
        }


        // =========== Init stoechiometric matrix (formed species in solution) =================================
        // One line per component, one column per specie
        // Species are components + formedSpecies

        var matrix = new Matrix(nComp, nSpecSolution + nComp);
        var identity = Matrix.identity(model.components.length);
        matrix.setSubMatrix(identity, 0, 0);

        // Now we modify the stoechiometric matrix if there are any components with fixed concentrations
        // Fixed components are removed from the model and beta values of species are updated accordingly
        var rows = [];
        for (i = 0; i < nComp; i++) {
            for (var j = 0; j < nSpecSolution; j++) {
                matrix.set(i, j + nComp, formedSpeciesSolution[j].components[i]);
            }
        }

        for (i = 0; i < nComp; i++) {
            // Fixed components have the atEquilibrium property set
            var atEq = model.components[i].atEquilibrium;
            if (!atEq) {
                // Keep this component in the final model
                rows.push(i);
            } else {
                // Update the beta value of all species
                // newBeta = oldBeta * fixedComponentConcentration^(stoechiometricCoefficient)
                var m = new Matrix(1, nSpecSolution + nComp).fill(atEq);
                m.pow([matrix.getRow(i)]);
                beta.multiply(m);
            }
        }

        // remove fixed components from beta and stoechiometric matrix
        var columns = rows.concat(getRange(nComp, nComp + nSpecSolution - 1));
        matrix = matrix.selection(rows, columns);
        beta = beta.selection([0], columns);

        // ============= Init stoechiometric matrix (formed solids) ================================================
        if(nSpecSolid) {
            rows = [];
            var solidMatrix = new Matrix(nComp, nSpecSolid);
            for(i=0 ;i<nComp; i++) {
                for (j=0; j<nSpecSolid; j++) {
                    solidMatrix.set(i, j, formedSpeciesSolid[j].components[i]);
                }
            }

            for (i = 0; i < nComp; i++) {
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
        }


        // ============= Labels and concentrations ==================================================================
        var specLabels = [];
        var fixedLabels = [];
        var cFixed = [];
        var compLabels = [];

        // Init labels and total concentration
        var cTotal = [];
        for (var i = 0; i < nComp; i++) {
            var component = model.components[i];
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

        specLabels = specLabels.concat(model.formedSpecies.map(f => f.label));
        var specSolutionLabels = formedSpeciesSolution.map(s => s.label);
        var specSolidLabels = formedSpeciesSolid.map(s => s.label);

        return {
            model: matrix.to2DArray(),
            beta: beta.to1DArray(),
            cTotal: cTotal,
            cFixed: cFixed,
            specLabels,
            compLabels,
            fixedLabels,
            specSolidLabels,
            specSolutionLabels,
            nFixed: nComp - matrix.rows,
            solidModel: solidMatrix.to2DArray(),
            solidBeta: solidBeta.to1DArray()
        };
    }

    /**
     * Solve the model. Initial concentrations set with {@link Equilibrium#setInitial setInitial} will be used as the
     * starting points of the optimization algorithm.
     * @returns {Object} An Object with as many properties as there are species. The key is the label of the specie,
     * and the value is the concentration at equilibrium of this specie.
     */
    solve() {
        var model = this._model;
        var initial = this._getInitial();
        var cSpec = newtonRaphton(model.model, model.beta, model.cTotal, initial.components, model.solidModel, model.solidBeta, initial.solids);
        return this._processResult(cSpec);
    }

    /**
     * Solve the model robustly. Does not take into account initial concentrations set with {@link #Equilibrium#setInitial setInitial}
     * Random initialization concentrations are used until the optimization algorithm converges. The number of tries
     * is set at instanciation with robustMaxTries
     * @returns {Object|null} An Object with as many properties as there are species. The key is the label of the specie,
     * and the value is the concentration at equilibrium of this specie.
     */
    solveRobust() {
        var model = this._model;
        for (var i = 0; i < this.options.robustMaxTries; i++) {
            console.log(model.specSolidLabels)
            var initial = {
                components: random.logarithmic(this.options.random, model.compLabels.length),
                solids: random.logarithmic(this.options.random, model.specSolidLabels.length)
            };
            console.log(model.model, model.beta, model.cTotal, initial.components, model.solidModel, model.solidBeta, initial.solids);
            var cSpec = newtonRaphton(model.model, model.beta, model.cTotal, initial.components, model.solidModel, model.solidBeta, initial.solids);
            if (cSpec) {
                return this._processResult(cSpec);
            }
        }

        return null;
    }

    /**
     * Set initial concentration of components
     * @param {Object} initial - Object where the key is the label of the component and the value is the initial
     * amount (in moles) of this components.
     */
    setInitial(init) {
        var initial = Object.assign({}, init);
        var keys = Object.keys(initial);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if(initial[key] === 0) initial[key] = 1e-15;
        }
        this._initial = initial;
    }

    /**
     * Transforms array of specie concentrations into object where the key is the specie label.
     * Adds the fixed concentrations to it
     * @private
     */
    _processResult(cSpec) {
        if (!cSpec) return;
        var result = {};
        for (var i = 0; i < this._model.specLabels.length; i++) {
            result[this._model.specLabels[i]] = cSpec[i];
        }


        for (i = 0; i < this._model.cFixed.length; i++) {
            result[this._model.fixedLabels[i]] = this._model.cFixed[i];
        }

        return result;
    }
}

module.exports = Equilibrium;

function getRange(start, end) {
    var arr = [];
    for (var i = start; i <= end; i++) {
        arr.push(i);
    }
    return arr;
}

function checkModel(model) {
    // check that labels are unique
    var labels = {};
    checkLabels(model.formedSpecies, labels);
    checkLabels(model.components, labels);
    checkComponents(model.components);
    checkFormedSpecies(model);
}

function checkLabels(arr, labels) {
    for (var i = 0; i < arr.length; i++) {
        var label = arr[i].label;
        if (label == undefined) throw new Error('Labels must be defined');
        if (labels[label]) throw new Error('Labels should be unique');
        labels[label] = true;
    }
}

function checkComponents(comp) {
    for(var i=0; i<comp.length; i++) {
        if(typeof comp[i].total !== 'number' && typeof comp[i].atEquilibrium !== 'number') {
            throw new Error('Component should have a property total or atEquilibrium that is a number');
        }
    }
}

function checkFormedSpecies(model) {
    var spec = model.formedSpecies;
    if(!spec) throw new Error('Formed species is not defined');
    for(var i=0; i<spec.length; i++) {
        var s = spec[i];
        if(!s.components || s.components.length !== model.components.length) {
            throw new Error('Formed species\' components array should have the same size as components');
        }
        if(typeof s.beta !== 'number') {
            throw new Error('All formed species should have a beta property');
        }
    }
}

function count(arr, cb) {
    var count = 0;
    for(var i=0; i<arr.length; i++) {
        if(cb(arr[i])) ++count;
    }
    return count;
}

function indices(arr, cb) {
    var idx = [];
    for(var i=0; i<arr.length; i++) {
        if(cb(arr[i])) idx.push(i);
    }
    return idx;
}