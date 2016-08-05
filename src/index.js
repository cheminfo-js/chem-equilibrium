'use strict';
const Matrix = require('ml-matrix');
const random = require('./util/random');
const newtonRaphton = require('./NewtonRaphton');

const defaultOptions = {
    robustMaxTries: 15
};

class Equilibrium {
    /**
     * @constructor
     * @param {Object} model
     * @param {Array} model.components - The equilibrium's independant components. Requires a label property and either
     * a total property (for total concentration) or an atEquilibrium property (for fixed final concentration)
     * @param {Array} model.formedSpecies - The list of species that are formed from the components.
     * @param {Array} model.formedSpecies[].components - The stoechiometric coefficient of each component. Should be the
     * same size as model.components.
     * @param {Object} options
     * @param {number} [options.robustMaxTries=15] - Maximum tries when using {@link Equilibrium#solveRobust solveRobust}.
     */
    constructor(model, options) {
        this.model = model;
        this._model = this._processModel(model);
        this.options = Object.assign({}, defaultOptions, options);
    }

    /**
     * Get initial values of components. Initial values that are not set by the user are choosen randomly
     * @returns {Array} Array which size is the number of non-fixed components
     * @private
     */
    _getInitial() {
        // Return random inital value for all labels that don't have a fixed initial value
        var keys = this._initial ? Object.keys(this._initial) : [];
        var initial = new Array(this._model.cTotal.length);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var idx = this._model.compLabels.indexOf(key);
            if (idx === -1) continue;
            initial[idx] = this._initial[key];
        }

        for (i = 0; i < initial.length; i++) {
            if (initial[i] === undefined) {
                initial[i] = random.logarithmic();
            }
        }
        return initial;
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

        // ========= init betas =====================================================================================
        // The formation constants for components is always 1
        var beta = new Matrix(1, nSpec).fill(1);
        // The other formation constants we pick from user
        beta.setSubMatrix([model.formedSpecies.map(c => c.beta)], 0, nComp);


        // =========== Init stoechiometric matrix ===================================================================
        // One line per component, one column per specie
        // Species are components + formedSpecies

        var matrix = new Matrix(nComp, nSpec);
        var identity = Matrix.identity(model.components.length);
        matrix.setSubMatrix(identity, 0, 0);

        // Now we modify the stoechiometric matrix if there are any components with fixed concentrations
        // Fixed components are removed from the model and beta values of species are updated accordingly
        var rows = [];
        for (i = 0; i < nComp; i++) {
            for (var j = 0; j < nFormed; j++) {
                matrix.set(i, j + nComp, model.formedSpecies[j].components[i]);
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
                var m = new Matrix(1, nSpec).fill(atEq);
                m.pow([matrix.getRow(i)]);
                beta.multiply(m);
            }
        }

        // remove fixed components from beta and stoechiometric matrix
        var columns = rows.concat(getRange(nComp, nSpec - 1));
        matrix = matrix.selection(rows, columns);
        beta = beta.selection([0], columns);


        // ============= Labels and concentrations ==================================================================
        var specLabels = [];
        var fixedLabels = [];
        var cFixed = [];

        // Init labels and total concentration
        var cTotal = [];
        for (var i = 0; i < nComp; i++) {
            var component = model.components[i];
            if (component.atEquilibrium) {
                // Keep concentration and label of fixed components
                fixedLabels.push(component.label);
                cFixed.push(component.atEquilibrium);
            } else {
                // Total concentration of components that will be involved in the optimization algorithm
                cTotal.push(component.total);
                specLabels.push(component.label)
            }
        }

        specLabels = specLabels.concat(model.formedSpecies.map(f => f.label));
        var compLabels = model.components.map(s => s.label);


        return {
            model: matrix.to2DArray(),
            beta: beta.to1DArray(),
            cTotal: cTotal,
            cFixed: cFixed,
            specLabels,
            compLabels,
            fixedLabels,
            nComp: matrix.rows,
            nSpec: matrix.columns,
            nFixed: nComp - matrix.rows
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
        var cSpec = newtonRaphton(model.model, model.beta, model.cTotal, initial);
        console.log('cSpec');
        console.log(cSpec);
        return this._processResult(cSpec);
    }

    /**
     * Solve the model robustly. Does not take into account initial concentrations set with {@link Equilibrium#setInitial setInitial}
     * Random initialization concentrations are used until the optimization algorithm converges. The number of tries
     * is set at instanciation with robustMaxTries
     * @returns {Object|null} An Object with as many properties as there are species. The key is the label of the specie,
     * and the value is the concentration at equilibrium of this specie.
     */
    solveRobust() {
        var model = this._model;
        for (var i = 0; i < this.options.robustMaxTries; i++) {
            var initial = random.logarithmic(model.nComp);
            var cSpec = newtonRaphton(model.model, model.beta, model.cTotal, initial);
            if (cSpec) {
                return this._processResult(cSpec);
            }
        }

        return null;
    }

    _processResult(cSpec) {
        if (!cSpec) return;
        console.log(cSpec);
        var result = {};
        for (var i = 0; i < cSpec.length; i++) {
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