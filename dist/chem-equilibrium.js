(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["chemEquilibrium"] = factory();
	else
		root["chemEquilibrium"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Equilibrium = __webpack_require__(1);
	var Factory = __webpack_require__(32);

	Equilibrium.Factory = Factory;

	module.exports = Equilibrium;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Matrix = __webpack_require__(2);
	var random = __webpack_require__(30);
	var newtonRaphton = __webpack_require__(31);

	var defaultOptions = {
	    robustMaxTries: 1000,
	    volume: 1,
	    random: Math.random,
	    autoInitial: true
	};

	/**
	 * Equilibrium
	 */

	var Equilibrium = function () {
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
	    function Equilibrium(model, options) {
	        _classCallCheck(this, Equilibrium);

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


	    _createClass(Equilibrium, [{
	        key: '_getInitial',
	        value: function _getInitial() {
	            // Return random inital value for all labels that don't have a fixed initial value
	            var keys = this._initial ? Object.keys(this._initial) : [];
	            var initial = new Array(this._model.nComp);
	            var initialSolid = new Array(this._model.specSolidLabels.length);

	            for (var i = 0; i < keys.length; i++) {
	                var key = keys[i];
	                var idx = this._model.compLabels.indexOf(key);
	                if (idx === -1) {
	                    idx = this._model.specSolidLabels.indexOf(key);
	                    if (idx !== -1) initialSolid[idx] = this._initial[key];
	                } else {
	                    initial[idx] = this._initial[key];
	                }
	            }

	            for (i = 0; i < initial.length; i++) {
	                if (initial[i] === undefined) {
	                    initial[i] = random.logarithmic(this.options.random);
	                }
	            }

	            for (i = 0; i < initialSolid.length; i++) {
	                if (initialSolid[i] === undefined) {
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

	    }, {
	        key: '_processModel',
	        value: function _processModel(model) {
	            // change betas and model to reflect what should be
	            // optimized in newton raphton
	            // Initialize model
	            var nFormed = model.formedSpecies.length;
	            var nComp = model.components.length;
	            var nSpec = nComp + nFormed;
	            var nSpecSolution = count(model.formedSpecies, function (spec) {
	                return !spec.solid;
	            });
	            var nSpecSolid = nSpec - nSpecSolution - nComp;

	            var formedSpeciesSolution = model.formedSpecies.filter(function (spec) {
	                return !spec.solid;
	            });
	            var formedSpeciesSolid = model.formedSpecies.filter(function (spec) {
	                return spec.solid;
	            });

	            // ========= init betas =====================================================================================
	            // The formation constants for components is always 1
	            var beta = new Matrix(1, nSpecSolution + nComp).fill(1);
	            // The other formation constants we pick from user
	            beta.setSubMatrix([formedSpeciesSolution.map(function (c) {
	                return c.beta;
	            })], 0, nComp);
	            if (nSpecSolid) {
	                var solidBeta = new Matrix([formedSpeciesSolid.map(function (c) {
	                    return c.beta;
	                })]);
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
	            if (nSpecSolid) {
	                rows = [];
	                var solidMatrix = new Matrix(nComp, nSpecSolid);
	                for (i = 0; i < nComp; i++) {
	                    for (j = 0; j < nSpecSolid; j++) {
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

	            specLabels = specLabels.concat(model.formedSpecies.map(function (f) {
	                return f.label;
	            }));
	            var specSolutionLabels = formedSpeciesSolution.map(function (s) {
	                return s.label;
	            });
	            var specSolidLabels = formedSpeciesSolid.map(function (s) {
	                return s.label;
	            });

	            return {
	                model: matrix.to2DArray(),
	                beta: beta.to1DArray(),
	                cTotal: cTotal,
	                cFixed: cFixed,
	                specLabels: specLabels,
	                compLabels: compLabels,
	                fixedLabels: fixedLabels,
	                specSolidLabels: specSolidLabels,
	                specSolutionLabels: specSolutionLabels,
	                nFixed: nComp - matrix.rows,
	                solidModel: solidMatrix && solidMatrix.to2DArray(),
	                solidBeta: solidBeta && solidBeta.to1DArray()
	            };
	        }

	        /**
	         * Solve the model. Initial concentrations set with {@link Equilibrium#setInitial setInitial} will be used as the
	         * starting points of the optimization algorithm.
	         * @returns {Object} An Object with as many properties as there are species. The key is the label of the specie,
	         * and the value is the concentration at equilibrium of this specie.
	         */

	    }, {
	        key: 'solve',
	        value: function solve() {
	            var model = this._model;
	            var initial = this._getInitial();
	            var cSpec = newtonRaphton(model.model, model.beta, model.cTotal, initial.components, model.solidModel, model.solidBeta, initial.solids);
	            var result = this._processResult(cSpec);
	            if (this.options.autoInitial) this.setInitial(result);
	            return result;
	        }

	        /**
	         * Solve the model robustly. Does not take into account initial concentrations set with {@link #Equilibrium#setInitial setInitial}
	         * Random initialization concentrations are used until the optimization algorithm converges. The number of tries
	         * is set at instanciation with robustMaxTries
	         * @returns {Object|null} An Object with as many properties as there are species. The key is the label of the specie,
	         * and the value is the concentration at equilibrium of this specie.
	         */

	    }, {
	        key: 'solveRobust',
	        value: function solveRobust() {
	            var model = this._model;
	            for (var i = 0; i < this.options.robustMaxTries; i++) {
	                var initial = {
	                    components: random.logarithmic(this.options.random, model.compLabels.length),
	                    solids: random.logarithmic(this.options.random, model.specSolidLabels.length)
	                };
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

	    }, {
	        key: 'setInitial',
	        value: function setInitial(init) {
	            var initial = Object.assign({}, init);
	            var keys = Object.keys(initial);
	            for (var i = 0; i < keys.length; i++) {
	                var key = keys[i];
	                if (initial[key] === 0) initial[key] = 1e-15;
	            }
	            this._initial = initial;
	        }

	        /**
	         * Transforms array of specie concentrations into object where the key is the specie label.
	         * Adds the fixed concentrations to it
	         * @private
	         */

	    }, {
	        key: '_processResult',
	        value: function _processResult(cSpec) {
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
	    }]);

	    return Equilibrium;
	}();

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
	    for (var i = 0; i < comp.length; i++) {
	        if (typeof comp[i].total !== 'number' && typeof comp[i].atEquilibrium !== 'number') {
	            throw new Error('Component should have a property total or atEquilibrium that is a number');
	        }
	    }
	}

	function checkFormedSpecies(model) {
	    var spec = model.formedSpecies;
	    if (!spec) throw new Error('Formed species is not defined');
	    for (var i = 0; i < spec.length; i++) {
	        var s = spec[i];
	        if (!s.components || s.components.length !== model.components.length) {
	            throw new Error('Formed species\' components array should have the same size as components');
	        }
	        if (typeof s.beta !== 'number') {
	            throw new Error('All formed species should have a beta property');
	        }
	    }
	}

	function count(arr, cb) {
	    var count = 0;
	    for (var i = 0; i < arr.length; i++) {
	        if (cb(arr[i])) ++count;
	    }
	    return count;
	}

	function indices(arr, cb) {
	    var idx = [];
	    for (var i = 0; i < arr.length; i++) {
	        if (cb(arr[i])) idx.push(i);
	    }
	    return idx;
	}

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(3);
	module.exports.Decompositions = module.exports.DC = __webpack_require__(23);


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	__webpack_require__(4);
	var abstractMatrix = __webpack_require__(5);
	var util = __webpack_require__(14);

	class Matrix extends abstractMatrix(Array) {
	    constructor(nRows, nColumns) {
	        if (arguments.length === 1 && typeof nRows === 'number') {
	            return new Array(nRows);
	        }
	        if (Matrix.isMatrix(nRows)) {
	            return nRows.clone();
	        } else if (Number.isInteger(nRows) && nRows > 0) { // Create an empty matrix
	            super(nRows);
	            if (Number.isInteger(nColumns) && nColumns > 0) {
	                for (var i = 0; i < nRows; i++) {
	                    this[i] = new Array(nColumns);
	                }
	            } else {
	                throw new TypeError('nColumns must be a positive integer');
	            }
	        } else if (Array.isArray(nRows)) { // Copy the values from the 2D array
	            var matrix = nRows;
	            nRows = matrix.length;
	            nColumns = matrix[0].length;
	            if (typeof nColumns !== 'number' || nColumns === 0) {
	                throw new TypeError('Data must be a 2D array with at least one element');
	            }
	            super(nRows);
	            for (var i = 0; i < nRows; i++) {
	                if (matrix[i].length !== nColumns) {
	                    throw new RangeError('Inconsistent array dimensions');
	                }
	                this[i] = [].concat(matrix[i]);
	            }
	        } else {
	            throw new TypeError('First argument must be a positive number or an array');
	        }
	        this.rows = nRows;
	        this.columns = nColumns;
	    }

	    set(rowIndex, columnIndex, value) {
	        this[rowIndex][columnIndex] = value;
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this[rowIndex][columnIndex];
	    }

	    /**
	     * Creates an exact and independent copy of the matrix
	     * @returns {Matrix}
	     */
	    clone() {
	        var newMatrix = new this.constructor[Symbol.species](this.rows, this.columns);
	        for (var row = 0; row < this.rows; row++) {
	            for (var column = 0; column < this.columns; column++) {
	                newMatrix.set(row, column, this.get(row, column));
	            }
	        }
	        return newMatrix;
	    }

	    /**
	     * Removes a row from the given index
	     * @param {number} index - Row index
	     * @returns {Matrix} this
	     */
	    removeRow(index) {
	        util.checkRowIndex(this, index);
	        if (this.rows === 1)
	            throw new RangeError('A matrix cannot have less than one row');
	        this.splice(index, 1);
	        this.rows -= 1;
	        return this;
	    }

	    /**
	     * Adds a row at the given index
	     * @param {number} [index = this.rows] - Row index
	     * @param {Array|Matrix} array - Array or vector
	     * @returns {Matrix} this
	     */
	    addRow(index, array) {
	        if (array === undefined) {
	            array = index;
	            index = this.rows;
	        }
	        util.checkRowIndex(this, index, true);
	        array = util.checkRowVector(this, array, true);
	        this.splice(index, 0, array);
	        this.rows += 1;
	        return this;
	    }

	    /**
	     * Removes a column from the given index
	     * @param {number} index - Column index
	     * @returns {Matrix} this
	     */
	    removeColumn(index) {
	        util.checkColumnIndex(this, index);
	        if (this.columns === 1)
	            throw new RangeError('A matrix cannot have less than one column');
	        for (var i = 0; i < this.rows; i++) {
	            this[i].splice(index, 1);
	        }
	        this.columns -= 1;
	        return this;
	    }

	    /**
	     * Adds a column at the given index
	     * @param {number} [index = this.columns] - Column index
	     * @param {Array|Matrix} array - Array or vector
	     * @returns {Matrix} this
	     */
	    addColumn(index, array) {
	        if (typeof array === 'undefined') {
	            array = index;
	            index = this.columns;
	        }
	        util.checkColumnIndex(this, index, true);
	        array = util.checkColumnVector(this, array);
	        for (var i = 0; i < this.rows; i++) {
	            this[i].splice(index, 0, array[i]);
	        }
	        this.columns += 1;
	        return this;
	    }
	}

	module.exports = Matrix;
	Matrix.abstractMatrix = abstractMatrix;


/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	if (!Symbol.species) {
	    Symbol.species = Symbol.for('@@species');
	}


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = abstractMatrix;

	var arrayUtils = __webpack_require__(6);
	var util = __webpack_require__(14);
	var MatrixTransposeView = __webpack_require__(15);
	var MatrixRowView = __webpack_require__(17);
	var MatrixSubView = __webpack_require__(18);
	var MatrixSelectionView = __webpack_require__(19);
	var MatrixColumnView = __webpack_require__(20);
	var MatrixFlipRowView = __webpack_require__(21);
	var MatrixFlipColumnView = __webpack_require__(22);

	function abstractMatrix(superCtor) {
	    if (superCtor === undefined) superCtor = Object;

	    /**
	     * Real matrix
	     * @class Matrix
	     * @param {number|Array|Matrix} nRows - Number of rows of the new matrix,
	     * 2D array containing the data or Matrix instance to clone
	     * @param {number} [nColumns] - Number of columns of the new matrix
	     */
	    class Matrix extends superCtor {
	        static get [Symbol.species]() {
	            return this;
	        }

	        /**
	         * Constructs a Matrix with the chosen dimensions from a 1D array
	         * @param {number} newRows - Number of rows
	         * @param {number} newColumns - Number of columns
	         * @param {Array} newData - A 1D array containing data for the matrix
	         * @returns {Matrix} - The new matrix
	         */
	        static from1DArray(newRows, newColumns, newData) {
	            var length = newRows * newColumns;
	            if (length !== newData.length) {
	                throw new RangeError('Data length does not match given dimensions');
	            }
	            var newMatrix = new this(newRows, newColumns);
	            for (var row = 0; row < newRows; row++) {
	                for (var column = 0; column < newColumns; column++) {
	                    newMatrix.set(row, column, newData[row * newColumns + column]);
	                }
	            }
	            return newMatrix;
	        }

	        /**
	         * Creates a row vector, a matrix with only one row.
	         * @param {Array} newData - A 1D array containing data for the vector
	         * @returns {Matrix} - The new matrix
	         */
	        static rowVector(newData) {
	            var vector = new this(1, newData.length);
	            for (var i = 0; i < newData.length; i++) {
	                vector.set(0, i, newData[i]);
	            }
	            return vector;
	        }

	        /**
	         * Creates a column vector, a matrix with only one column.
	         * @param {Array} newData - A 1D array containing data for the vector
	         * @returns {Matrix} - The new matrix
	         */
	        static columnVector(newData) {
	            var vector = new this(newData.length, 1);
	            for (var i = 0; i < newData.length; i++) {
	                vector.set(i, 0, newData[i]);
	            }
	            return vector;
	        }

	        /**
	         * Creates an empty matrix with the given dimensions. Values will be undefined. Same as using new Matrix(rows, columns).
	         * @param {number} rows - Number of rows
	         * @param {number} columns - Number of columns
	         * @returns {Matrix} - The new matrix
	         */
	        static empty(rows, columns) {
	            return new this(rows, columns);
	        }

	        /**
	         * Creates a matrix with the given dimensions. Values will be set to zero.
	         * @param {number} rows - Number of rows
	         * @param {number} columns - Number of columns
	         * @returns {Matrix} - The new matrix
	         */
	        static zeros(rows, columns) {
	            return this.empty(rows, columns).fill(0);
	        }

	        /**
	         * Creates a matrix with the given dimensions. Values will be set to one.
	         * @param {number} rows - Number of rows
	         * @param {number} columns - Number of columns
	         * @returns {Matrix} - The new matrix
	         */
	        static ones(rows, columns) {
	            return this.empty(rows, columns).fill(1);
	        }

	        /**
	         * Creates a matrix with the given dimensions. Values will be randomly set.
	         * @param {number} rows - Number of rows
	         * @param {number} columns - Number of columns
	         * @param {function} [rng] - Random number generator (default: Math.random)
	         * @returns {Matrix} The new matrix
	         */
	        static rand(rows, columns, rng) {
	            if (rng === undefined) rng = Math.random;
	            var matrix = this.empty(rows, columns);
	            for (var i = 0; i < rows; i++) {
	                for (var j = 0; j < columns; j++) {
	                    matrix.set(i, j, rng());
	                }
	            }
	            return matrix;
	        }

	        /**
	         * Creates an identity matrix with the given dimension. Values of the diagonal will be 1 and others will be 0.
	         * @param {number} rows - Number of rows
	         * @param {number} [columns] - Number of columns (Default: rows)
	         * @returns {Matrix} - The new identity matrix
	         */
	        static eye(rows, columns) {
	            if (columns === undefined) columns = rows;
	            var min = Math.min(rows, columns);
	            var matrix = this.zeros(rows, columns);
	            for (var i = 0; i < min; i++) {
	                matrix.set(i, i, 1);
	            }
	            return matrix;
	        }

	        /**
	         * Creates a diagonal matrix based on the given array.
	         * @param {Array} data - Array containing the data for the diagonal
	         * @param {number} [rows] - Number of rows (Default: data.length)
	         * @param {number} [columns] - Number of columns (Default: rows)
	         * @returns {Matrix} - The new diagonal matrix
	         */
	        static diag(data, rows, columns) {
	            var l = data.length;
	            if (rows === undefined) rows = l;
	            if (columns === undefined) columns = rows;
	            var min = Math.min(l, rows, columns);
	            var matrix = this.zeros(rows, columns);
	            for (var i = 0; i < min; i++) {
	                matrix.set(i, i, data[i]);
	            }
	            return matrix;
	        }

	        /**
	         * Returns a matrix whose elements are the minimum between matrix1 and matrix2
	         * @param matrix1
	         * @param matrix2
	         * @returns {Matrix}
	         */
	        static min(matrix1, matrix2) {
	            matrix1 = this.checkMatrix(matrix1);
	            matrix2 = this.checkMatrix(matrix2);
	            var rows = matrix1.rows;
	            var columns = matrix1.columns;
	            var result = new this(rows, columns);
	            for (var i = 0; i < rows; i++) {
	                for (var j = 0; j < columns; j++) {
	                    result.set(i, j, Math.min(matrix1.get(i, j), matrix2.get(i, j)));
	                }
	            }
	            return result;
	        }

	        /**
	         * Returns a matrix whose elements are the maximum between matrix1 and matrix2
	         * @param matrix1
	         * @param matrix2
	         * @returns {Matrix}
	         */
	        static max(matrix1, matrix2) {
	            matrix1 = this.checkMatrix(matrix1);
	            matrix2 = this.checkMatrix(matrix2);
	            var rows = matrix1.rows;
	            var columns = matrix1.columns;
	            var result = new this(rows, columns);
	            for (var i = 0; i < rows; i++) {
	                for (var j = 0; j < columns; j++) {
	                    result.set(i, j, Math.max(matrix1.get(i, j), matrix2.get(i, j)));
	                }
	            }
	            return result;
	        }

	        /**
	         * Check that the provided value is a Matrix and tries to instantiate one if not
	         * @param value - The value to check
	         * @returns {Matrix}
	         */
	        static checkMatrix(value) {
	            return Matrix.isMatrix(value) ? value : new this(value);
	        }

	        /**
	         * Returns true if the argument is a Matrix, false otherwise
	         * @param value - The value to check
	         * @return {boolean}
	         */
	        static isMatrix(value) {
	            return (value != null) && (value.klass === 'Matrix');
	        }

	        /**
	         * @property {number} - The number of elements in the matrix.
	         */
	        get size() {
	            return this.rows * this.columns;
	        }

	        /**
	         * Applies a callback for each element of the matrix. The function is called in the matrix (this) context.
	         * @param {function} callback - Function that will be called with two parameters : i (row) and j (column)
	         * @returns {Matrix} this
	         */
	        apply(callback) {
	            if (typeof callback !== 'function') {
	                throw new TypeError('callback must be a function');
	            }
	            var ii = this.rows;
	            var jj = this.columns;
	            for (var i = 0; i < ii; i++) {
	                for (var j = 0; j < jj; j++) {
	                    callback.call(this, i, j);
	                }
	            }
	            return this;
	        }

	        /**
	         * Returns a new 1D array filled row by row with the matrix values
	         * @returns {Array}
	         */
	        to1DArray() {
	            var array = new Array(this.size);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    array[i * this.columns + j] = this.get(i, j);
	                }
	            }
	            return array;
	        }

	        /**
	         * Returns a 2D array containing a copy of the data
	         * @returns {Array}
	         */
	        to2DArray() {
	            var copy = new Array(this.rows);
	            for (var i = 0; i < this.rows; i++) {
	                copy[i] = new Array(this.columns);
	                for (var j = 0; j < this.columns; j++) {
	                    copy[i][j] = this.get(i, j);
	                }
	            }
	            return copy;
	        }

	        /**
	         * @returns {boolean} true if the matrix has one row
	         */
	        isRowVector() {
	            return this.rows === 1;
	        }

	        /**
	         * @returns {boolean} true if the matrix has one column
	         */
	        isColumnVector() {
	            return this.columns === 1;
	        }

	        /**
	         * @returns {boolean} true if the matrix has one row or one column
	         */
	        isVector() {
	            return (this.rows === 1) || (this.columns === 1);
	        }

	        /**
	         * @returns {boolean} true if the matrix has the same number of rows and columns
	         */
	        isSquare() {
	            return this.rows === this.columns;
	        }

	        /**
	         * @returns {boolean} true if the matrix is square and has the same values on both sides of the diagonal
	         */
	        isSymmetric() {
	            if (this.isSquare()) {
	                for (var i = 0; i < this.rows; i++) {
	                    for (var j = 0; j <= i; j++) {
	                        if (this.get(i, j) !== this.get(j, i)) {
	                            return false;
	                        }
	                    }
	                }
	                return true;
	            }
	            return false;
	        }

	        /**
	         * Sets a given element of the matrix. mat.set(3,4,1) is equivalent to mat[3][4]=1
	         * @param {number} rowIndex - Index of the row
	         * @param {number} columnIndex - Index of the column
	         * @param {number} value - The new value for the element
	         * @returns {Matrix} this
	         */
	        set(rowIndex, columnIndex, value) {
	            throw new Error('set method is unimplemented');
	        }

	        /**
	         * Returns the given element of the matrix. mat.get(3,4) is equivalent to matrix[3][4]
	         * @param {number} rowIndex - Index of the row
	         * @param {number} columnIndex - Index of the column
	         * @returns {number}
	         */
	        get(rowIndex, columnIndex) {
	            throw new Error('get method is unimplemented');
	        }

	        /**
	         * Creates a new matrix that is a repetition of the current matrix. New matrix has rowRep times the number of
	         * rows of the matrix, and colRep times the number of columns of the matrix
	         * @param {number} rowRep - Number of times the rows should be repeated
	         * @param {number} colRep - Number of times the columns should be re
	         * @example
	         * var matrix = new Matrix([[1,2]]);
	         * matrix.repeat(2); // [[1,2],[1,2]]
	         */
	        repeat(rowRep, colRep) {
	            rowRep = rowRep || 1;
	            colRep = colRep || 1;
	            var matrix = new this.constructor[Symbol.species](this.rows * rowRep, this.columns * colRep);
	            for (var i = 0; i < rowRep; i++) {
	                for (var j = 0; j < colRep; j++) {
	                    matrix.setSubMatrix(this, this.rows * i, this.columns * j);
	                }
	            }
	            return matrix;
	        }

	        /**
	         * Fills the matrix with a given value. All elements will be set to this value.
	         * @param {number} value - New value
	         * @returns {Matrix} this
	         */
	        fill(value) {
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, value);
	                }
	            }
	            return this;
	        }

	        /**
	         * Negates the matrix. All elements will be multiplied by (-1)
	         * @returns {Matrix} this
	         */
	        neg() {
	            return this.mulS(-1);
	        }

	        /**
	         * Returns a new array from the given row index
	         * @param {number} index - Row index
	         * @returns {Array}
	         */
	        getRow(index) {
	            util.checkRowIndex(this, index);
	            var row = new Array(this.columns);
	            for (var i = 0; i < this.columns; i++) {
	                row[i] = this.get(index, i);
	            }
	            return row;
	        }

	        /**
	         * Returns a new row vector from the given row index
	         * @param {number} index - Row index
	         * @returns {Matrix}
	         */
	        getRowVector(index) {
	            return this.constructor.rowVector(this.getRow(index));
	        }

	        /**
	         * Sets a row at the given index
	         * @param {number} index - Row index
	         * @param {Array|Matrix} array - Array or vector
	         * @returns {Matrix} this
	         */
	        setRow(index, array) {
	            util.checkRowIndex(this, index);
	            array = util.checkRowVector(this, array);
	            for (var i = 0; i < this.columns; i++) {
	                this.set(index, i, array[i]);
	            }
	            return this;
	        }

	        /**
	         * Swaps two rows
	         * @param {number} row1 - First row index
	         * @param {number} row2 - Second row index
	         * @returns {Matrix} this
	         */
	        swapRows(row1, row2) {
	            util.checkRowIndex(this, row1);
	            util.checkRowIndex(this, row2);
	            for (var i = 0; i < this.columns; i++) {
	                var temp = this.get(row1, i);
	                this.set(row1, i, this.get(row2, i));
	                this.set(row2, i, temp);
	            }
	            return this;
	        }

	        /**
	         * Returns a new array from the given column index
	         * @param {number} index - Column index
	         * @returns {Array}
	         */
	        getColumn(index) {
	            util.checkColumnIndex(this, index);
	            var column = new Array(this.rows);
	            for (var i = 0; i < this.rows; i++) {
	                column[i] = this.get(i, index);
	            }
	            return column;
	        }

	        /**
	         * Returns a new column vector from the given column index
	         * @param {number} index - Column index
	         * @returns {Matrix}
	         */
	        getColumnVector(index) {
	            return this.constructor.columnVector(this.getColumn(index));
	        }

	        /**
	         * Sets a column at the given index
	         * @param {number} index - Column index
	         * @param {Array|Matrix} array - Array or vector
	         * @returns {Matrix} this
	         */
	        setColumn(index, array) {
	            util.checkColumnIndex(this, index);
	            array = util.checkColumnVector(this, array);
	            for (var i = 0; i < this.rows; i++) {
	                this.set(i, index, array[i]);
	            }
	            return this;
	        }

	        /**
	         * Swaps two columns
	         * @param {number} column1 - First column index
	         * @param {number} column2 - Second column index
	         * @returns {Matrix} this
	         */
	        swapColumns(column1, column2) {
	            util.checkColumnIndex(this, column1);
	            util.checkColumnIndex(this, column2);
	            for (var i = 0; i < this.rows; i++) {
	                var temp = this.get(i, column1);
	                this.set(i, column1, this.get(i, column2));
	                this.set(i, column2, temp);
	            }
	            return this;
	        }

	        /**
	         * Adds the values of a vector to each row
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        addRowVector(vector) {
	            vector = util.checkRowVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) + vector[j]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Subtracts the values of a vector from each row
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        subRowVector(vector) {
	            vector = util.checkRowVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) - vector[j]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Multiplies the values of a vector with each row
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        mulRowVector(vector) {
	            vector = util.checkRowVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) * vector[j]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Divides the values of each row by those of a vector
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        divRowVector(vector) {
	            vector = util.checkRowVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) / vector[j]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Adds the values of a vector to each column
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        addColumnVector(vector) {
	            vector = util.checkColumnVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) + vector[i]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Subtracts the values of a vector from each column
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        subColumnVector(vector) {
	            vector = util.checkColumnVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) - vector[i]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Multiplies the values of a vector with each column
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        mulColumnVector(vector) {
	            vector = util.checkColumnVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) * vector[i]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Divides the values of each column by those of a vector
	         * @param {Array|Matrix} vector - Array or vector
	         * @returns {Matrix} this
	         */
	        divColumnVector(vector) {
	            vector = util.checkColumnVector(this, vector);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    this.set(i, j, this.get(i, j) / vector[i]);
	                }
	            }
	            return this;
	        }

	        /**
	         * Multiplies the values of a row with a scalar
	         * @param {number} index - Row index
	         * @param {number} value
	         * @returns {Matrix} this
	         */
	        mulRow(index, value) {
	            util.checkRowIndex(this, index);
	            for (var i = 0; i < this.columns; i++) {
	                this.set(index, i, this.get(index, i) * value);
	            }
	            return this;
	        }

	        /**
	         * Multiplies the values of a column with a scalar
	         * @param {number} index - Column index
	         * @param {number} value
	         * @returns {Matrix} this
	         */
	        mulColumn(index, value) {
	            util.checkColumnIndex(this, index);
	            for (var i = 0; i < this.rows; i++) {
	                this.set(i, index, this.get(i, index) * value);
	            }
	        }

	        /**
	         * Returns the maximum value of the matrix
	         * @returns {number}
	         */
	        max() {
	            var v = this.get(0, 0);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    if (this.get(i, j) > v) {
	                        v = this.get(i, j);
	                    }
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the maximum value
	         * @returns {Array}
	         */
	        maxIndex() {
	            var v = this.get(0, 0);
	            var idx = [0, 0];
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    if (this.get(i, j) > v) {
	                        v = this.get(i, j);
	                        idx[0] = i;
	                        idx[1] = j;
	                    }
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns the minimum value of the matrix
	         * @returns {number}
	         */
	        min() {
	            var v = this.get(0, 0);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    if (this.get(i, j) < v) {
	                        v = this.get(i, j);
	                    }
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the minimum value
	         * @returns {Array}
	         */
	        minIndex() {
	            var v = this.get(0, 0);
	            var idx = [0, 0];
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    if (this.get(i, j) < v) {
	                        v = this.get(i, j);
	                        idx[0] = i;
	                        idx[1] = j;
	                    }
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns the maximum value of one row
	         * @param {number} row - Row index
	         * @returns {number}
	         */
	        maxRow(row) {
	            util.checkRowIndex(this, row);
	            var v = this.get(row, 0);
	            for (var i = 1; i < this.columns; i++) {
	                if (this.get(row, i) > v) {
	                    v = this.get(row, i);
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the maximum value of one row
	         * @param {number} row - Row index
	         * @returns {Array}
	         */
	        maxRowIndex(row) {
	            util.checkRowIndex(this, row);
	            var v = this.get(row, 0);
	            var idx = [row, 0];
	            for (var i = 1; i < this.columns; i++) {
	                if (this.get(row, i) > v) {
	                    v = this.get(row, i);
	                    idx[1] = i;
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns the minimum value of one row
	         * @param {number} row - Row index
	         * @returns {number}
	         */
	        minRow(row) {
	            util.checkRowIndex(this, row);
	            var v = this.get(row, 0);
	            for (var i = 1; i < this.columns; i++) {
	                if (this.get(row, i) < v) {
	                    v = this.get(row, i);
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the maximum value of one row
	         * @param {number} row - Row index
	         * @returns {Array}
	         */
	        minRowIndex(row) {
	            util.checkRowIndex(this, row);
	            var v = this.get(row, 0);
	            var idx = [row, 0];
	            for (var i = 1; i < this.columns; i++) {
	                if (this.get(row, i) < v) {
	                    v = this.get(row, i);
	                    idx[1] = i;
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns the maximum value of one column
	         * @param {number} column - Column index
	         * @returns {number}
	         */
	        maxColumn(column) {
	            util.checkColumnIndex(this, column);
	            var v = this.get(0, column);
	            for (var i = 1; i < this.rows; i++) {
	                if (this.get(i, column) > v) {
	                    v = this.get(i, column);
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the maximum value of one column
	         * @param {number} column - Column index
	         * @returns {Array}
	         */
	        maxColumnIndex(column) {
	            util.checkColumnIndex(this, column);
	            var v = this.get(0, column);
	            var idx = [0, column];
	            for (var i = 1; i < this.rows; i++) {
	                if (this.get(i, column) > v) {
	                    v = this.get(i, column);
	                    idx[0] = i;
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns the minimum value of one column
	         * @param {number} column - Column index
	         * @returns {number}
	         */
	        minColumn(column) {
	            util.checkColumnIndex(this, column);
	            var v = this.get(0, column);
	            for (var i = 1; i < this.rows; i++) {
	                if (this.get(i, column) < v) {
	                    v = this.get(i, column);
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the index of the minimum value of one column
	         * @param {number} column - Column index
	         * @returns {Array}
	         */
	        minColumnIndex(column) {
	            util.checkColumnIndex(this, column);
	            var v = this.get(0, column);
	            var idx = [0, column];
	            for (var i = 1; i < this.rows; i++) {
	                if (this.get(i, column) < v) {
	                    v = this.get(i, column);
	                    idx[0] = i;
	                }
	            }
	            return idx;
	        }

	        /**
	         * Returns an array containing the diagonal values of the matrix
	         * @returns {Array}
	         */
	        diag() {
	            var min = Math.min(this.rows, this.columns);
	            var diag = new Array(min);
	            for (var i = 0; i < min; i++) {
	                diag[i] = this.get(i, i);
	            }
	            return diag;
	        }

	        /**
	         * Returns the sum of all elements of the matrix
	         * @returns {number}
	         */
	        sum() {
	            var v = 0;
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    v += this.get(i, j);
	                }
	            }
	            return v;
	        }

	        /**
	         * Returns the mean of all elements of the matrix
	         * @returns {number}
	         */
	        mean() {
	            return this.sum() / this.size;
	        }

	        /**
	         * Returns the product of all elements of the matrix
	         * @returns {number}
	         */
	        prod() {
	            var prod = 1;
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    prod *= this.get(i, j);
	                }
	            }
	            return prod;
	        }

	        /**
	         * Computes the cumulative sum of the matrix elements (in place, row by row)
	         * @returns {Matrix} this
	         */
	        cumulativeSum() {
	            var sum = 0;
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    sum += this.get(i, j);
	                    this.set(i, j, sum);
	                }
	            }
	            return this;
	        }

	        /**
	         * Computes the dot (scalar) product between the matrix and another
	         * @param {Matrix} vector2 vector
	         * @returns {number}
	         */
	        dot(vector2) {
	            if (Matrix.isMatrix(vector2)) vector2 = vector2.to1DArray();
	            var vector1 = this.to1DArray();
	            if (vector1.length !== vector2.length) {
	                throw new RangeError('vectors do not have the same size');
	            }
	            var dot = 0;
	            for (var i = 0; i < vector1.length; i++) {
	                dot += vector1[i] * vector2[i];
	            }
	            return dot;
	        }

	        /**
	         * Returns the matrix product between this and other
	         * @param {Matrix} other
	         * @returns {Matrix}
	         */
	        mmul(other) {
	            other = this.constructor.checkMatrix(other);
	            if (this.columns !== other.rows)
	                throw new Error('Number of columns of left matrix are not equal to number of rows of right matrix.');

	            var m = this.rows;
	            var n = this.columns;
	            var p = other.columns;

	            var result = new this.constructor[Symbol.species](m, p);

	            var Bcolj = new Array(n);
	            for (var j = 0; j < p; j++) {
	                for (var k = 0; k < n; k++) {
	                    Bcolj[k] = other.get(k, j);
	                }

	                for (var i = 0; i < m; i++) {
	                    var s = 0;
	                    for (k = 0; k < n; k++) {
	                        s += this.get(i, k) * Bcolj[k];
	                    }

	                    result.set(i, j, s);
	                }
	            }
	            return result;
	        }

	        /**
	         * Returns a row-by-row scaled matrix
	         * @param {Number} [min=0] - Minimum scaled value
	         * @param {Number} [max=1] - Maximum scaled value
	         * @returns {Matrix} - The scaled matrix
	         */
	        scaleRows(min, max) {
	            min = min === undefined ? 0 : min;
	            max = max === undefined ? 1 : max;
	            if (min >= max) {
	                throw new RangeError('min should be strictly smaller than max');
	            }
	            var newMatrix = this.constructor.empty(this.rows, this.columns);
	            for (var i = 0; i < this.rows; i++) {
	                var scaled = arrayUtils.scale(this.getRow(i), {min, max});
	                newMatrix.setRow(i, scaled);
	            }
	            return newMatrix;
	        }

	        /**
	         * Returns a new column-by-column scaled matrix
	         * @param {Number} [min=0] - Minimum scaled value
	         * @param {Number} [max=1] - Maximum scaled value
	         * @returns {Matrix} - The new scaled matrix
	         * @example
	         * var matrix = new Matrix([[1,2],[-1,0]]);
	         * var scaledMatrix = matrix.scaleColumns(); // [[1,1],[0,0]]
	         */
	        scaleColumns(min, max) {
	            min = min === undefined ? 0 : min;
	            max = max === undefined ? 1 : max;
	            if (min >= max) {
	                throw new RangeError('min should be strictly smaller than max');
	            }
	            var newMatrix = this.constructor.empty(this.rows, this.columns);
	            for (var i = 0; i < this.columns; i++) {
	                var scaled = arrayUtils.scale(this.getColumn(i), {
	                    min: min,
	                    max: max
	                });
	                newMatrix.setColumn(i, scaled);
	            }
	            return newMatrix;
	        }


	        /**
	         * Returns the Kronecker product (also known as tensor product) between this and other
	         * See https://en.wikipedia.org/wiki/Kronecker_product
	         * @param {Matrix} other
	         * @return {Matrix}
	         */
	        kroneckerProduct(other) {
	            other = this.constructor.checkMatrix(other);

	            var m = this.rows;
	            var n = this.columns;
	            var p = other.rows;
	            var q = other.columns;

	            var result = new this.constructor[Symbol.species](m * p, n * q);
	            for (var i = 0; i < m; i++) {
	                for (var j = 0; j < n; j++) {
	                    for (var k = 0; k < p; k++) {
	                        for (var l = 0; l < q; l++) {
	                            result[p * i + k][q * j + l] = this.get(i, j) * other.get(k, l);
	                        }
	                    }
	                }
	            }
	            return result;
	        }

	        /**
	         * Transposes the matrix and returns a new one containing the result
	         * @returns {Matrix}
	         */
	        transpose() {
	            var result = new this.constructor[Symbol.species](this.columns, this.rows);
	            for (var i = 0; i < this.rows; i++) {
	                for (var j = 0; j < this.columns; j++) {
	                    result.set(j, i, this.get(i, j));
	                }
	            }
	            return result;
	        }

	        /**
	         * Sorts the rows (in place)
	         * @param {function} compareFunction - usual Array.prototype.sort comparison function
	         * @returns {Matrix} this
	         */
	        sortRows(compareFunction) {
	            if (compareFunction === undefined) compareFunction = compareNumbers;
	            for (var i = 0; i < this.rows; i++) {
	                this.setRow(i, this.getRow(i).sort(compareFunction));
	            }
	            return this;
	        }

	        /**
	         * Sorts the columns (in place)
	         * @param {function} compareFunction - usual Array.prototype.sort comparison function
	         * @returns {Matrix} this
	         */
	        sortColumns(compareFunction) {
	            if (compareFunction === undefined) compareFunction = compareNumbers;
	            for (var i = 0; i < this.columns; i++) {
	                this.setColumn(i, this.getColumn(i).sort(compareFunction));
	            }
	            return this;
	        }

	        /**
	         * Returns a subset of the matrix
	         * @param {number} startRow - First row index
	         * @param {number} endRow - Last row index
	         * @param {number} startColumn - First column index
	         * @param {number} endColumn - Last column index
	         * @returns {Matrix}
	         */
	        subMatrix(startRow, endRow, startColumn, endColumn) {
	            util.checkRange(this, startRow, endRow, startColumn, endColumn);
	            var newMatrix = new this.constructor[Symbol.species](endRow - startRow + 1, endColumn - startColumn + 1);
	            for (var i = startRow; i <= endRow; i++) {
	                for (var j = startColumn; j <= endColumn; j++) {
	                    newMatrix[i - startRow][j - startColumn] = this.get(i, j);
	                }
	            }
	            return newMatrix;
	        }

	        /**
	         * Returns a subset of the matrix based on an array of row indices
	         * @param {Array} indices - Array containing the row indices
	         * @param {number} [startColumn = 0] - First column index
	         * @param {number} [endColumn = this.columns-1] - Last column index
	         * @returns {Matrix}
	         */
	        subMatrixRow(indices, startColumn, endColumn) {
	            if (startColumn === undefined) startColumn = 0;
	            if (endColumn === undefined) endColumn = this.columns - 1;
	            if ((startColumn > endColumn) || (startColumn < 0) || (startColumn >= this.columns) || (endColumn < 0) || (endColumn >= this.columns)) {
	                throw new RangeError('Argument out of range');
	            }

	            var newMatrix = new this.constructor[Symbol.species](indices.length, endColumn - startColumn + 1);
	            for (var i = 0; i < indices.length; i++) {
	                for (var j = startColumn; j <= endColumn; j++) {
	                    if (indices[i] < 0 || indices[i] >= this.rows) {
	                        throw new RangeError('Row index out of range: ' + indices[i]);
	                    }
	                    newMatrix.set(i, j - startColumn, this.get(indices[i], j));
	                }
	            }
	            return newMatrix;
	        }

	        /**
	         * Returns a subset of the matrix based on an array of column indices
	         * @param {Array} indices - Array containing the column indices
	         * @param {number} [startRow = 0] - First row index
	         * @param {number} [endRow = this.rows-1] - Last row index
	         * @returns {Matrix}
	         */
	        subMatrixColumn(indices, startRow, endRow) {
	            if (startRow === undefined) startRow = 0;
	            if (endRow === undefined) endRow = this.rows - 1;
	            if ((startRow > endRow) || (startRow < 0) || (startRow >= this.rows) || (endRow < 0) || (endRow >= this.rows)) {
	                throw new RangeError('Argument out of range');
	            }

	            var newMatrix = new this.constructor[Symbol.species](endRow - startRow + 1, indices.length);
	            for (var i = 0; i < indices.length; i++) {
	                for (var j = startRow; j <= endRow; j++) {
	                    if (indices[i] < 0 || indices[i] >= this.columns) {
	                        throw new RangeError('Column index out of range: ' + indices[i]);
	                    }
	                    newMatrix.set(j - startRow, i, this.get(j, indices[i]));
	                }
	            }
	            return newMatrix;
	        }

	        /**
	         * Set a part of the matrix to the given sub-matrix
	         * @param {Matrix|Array< Array >} matrix - The source matrix from which to extract values.
	         * @param startRow - The index of the first row to set
	         * @param startColumn - The index of the first column to set
	         * @returns {Matrix}
	         */
	        setSubMatrix(matrix, startRow, startColumn) {
	            matrix = this.constructor.checkMatrix(matrix);
	            var endRow = startRow + matrix.rows - 1;
	            var endColumn = startColumn + matrix.columns - 1;
	            if ((startRow > endRow) || (startColumn > endColumn) || (startRow < 0) || (startRow >= this.rows) || (endRow < 0) || (endRow >= this.rows) || (startColumn < 0) || (startColumn >= this.columns) || (endColumn < 0) || (endColumn >= this.columns)) {
	                throw new RangeError('Argument out of range');
	            }
	            for (var i = 0; i < matrix.rows; i++) {
	                for (var j = 0; j < matrix.columns; j++) {
	                    this[startRow + i][startColumn + j] = matrix.get(i, j);
	                }
	            }
	            return this;
	        }

	        /**
	         * Return a new matrix based on a selection of rows and columns
	         * @param {Array<number>} rowIndices - The row indices to select. Order matters and an index can be more than once.
	         * @param {Array<number>} columnIndices - The column indices to select. Order matters and an index can be use more than once.
	         * @returns {Matrix} The new matrix
	         */
	        selection(rowIndices, columnIndices) {
	            var indices = util.checkIndices(this, rowIndices, columnIndices);
	            var newMatrix = new this.constructor(rowIndices.length, columnIndices.length);
	            for (var i = 0; i < indices.row.length; i++) {
	                var rowIndex = indices.row[i];
	                for (var j = 0; j < indices.column.length; j++) {
	                    var columnIndex = indices.column[j];
	                    newMatrix[i][j] = this.get(rowIndex, columnIndex);
	                }
	            }
	            return newMatrix;
	        }

	        /**
	         * Returns the trace of the matrix (sum of the diagonal elements)
	         * @returns {number}
	         */
	        trace() {
	            var min = Math.min(this.rows, this.columns);
	            var trace = 0;
	            for (var i = 0; i < min; i++) {
	                trace += this.get(i, i);
	            }
	            return trace;
	        }

	        /*
	        Matrix views
	         */
	        transposeView() {
	            return new MatrixTransposeView(this);
	        }

	        rowView(row) {
	            util.checkRowIndex(this, row);
	            return new MatrixRowView(this, row);
	        }

	        columnView(column) {
	            util.checkColumnIndex(this, column);
	            return new MatrixColumnView(this, column);
	        }

	        flipRowView() {
	            return new MatrixFlipRowView(this);
	        }

	        flipColumnView() {
	            return new MatrixFlipColumnView(this);
	        }

	        subMatrixView(startRow, endRow, startColumn, endColumn) {
	            return new MatrixSubView(this, startRow, endRow, startColumn, endColumn);
	        }

	        selectionView(rowIndices, columnIndices) {
	            return new MatrixSelectionView(this, rowIndices, columnIndices);
	        }
	    }

	    Matrix.prototype.klass = 'Matrix';

	    /**
	     * @private
	     * Check that two matrices have the same dimensions
	     * @param {Matrix} matrix
	     * @param {Matrix} otherMatrix
	     */
	    function checkDimensions(matrix, otherMatrix) {
	        if (matrix.rows !== otherMatrix.rows ||
	            matrix.columns !== otherMatrix.columns) {
	            throw new RangeError('Matrices dimensions must be equal');
	        }
	    }

	    function compareNumbers(a, b) {
	        return a - b;
	    }

	    /*
	     Synonyms
	     */

	    Matrix.random = Matrix.rand;
	    Matrix.diagonal = Matrix.diag;
	    Matrix.prototype.diagonal = Matrix.prototype.diag;
	    Matrix.identity = Matrix.eye;
	    Matrix.prototype.negate = Matrix.prototype.neg;
	    Matrix.prototype.tensorProduct = Matrix.prototype.kroneckerProduct;

	    /*
	     Add dynamically instance and static methods for mathematical operations
	     */

	    var inplaceOperator = `
	(function %name%(value) {
	    if (typeof value === 'number') return this.%name%S(value);
	    return this.%name%M(value);
	})
	`;

	    var inplaceOperatorScalar = `
	(function %name%S(value) {
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, this.get(i, j) %op% value);
	        }
	    }
	    return this;
	})
	`;

	    var inplaceOperatorMatrix = `
	(function %name%M(matrix) {
	    matrix = this.constructor.checkMatrix(matrix);
	    checkDimensions(this, matrix);
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, this.get(i, j) %op% matrix.get(i, j));
	        }
	    }
	    return this;
	})
	`;

	    var staticOperator = `
	(function %name%(matrix, value) {
	    var newMatrix = new this(matrix);
	    return newMatrix.%name%(value);
	})
	`;

	    var inplaceMethod = `
	(function %name%() {
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, %method%(this.get(i, j)));
	        }
	    }
	    return this;
	})
	`;

	    var staticMethod = `
	(function %name%(matrix) {
	    var newMatrix = new this(matrix);
	    return newMatrix.%name%();
	})
	`;

	    var inplaceMethodWithArgs = `
	(function %name%(%args%) {
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, %method%(this.get(i, j), %args%));
	        }
	    }
	    return this;
	})
	`;

	    var staticMethodWithArgs = `
	(function %name%(matrix, %args%) {
	    var newMatrix = new this(matrix);
	    return newMatrix.%name%(%args%);
	})
	`;


	    var inplaceMethodWithOneArgScalar = `
	(function %name%S(value) {
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, %method%(this.get(i, j), value));
	        }
	    }
	    return this;
	})
	`;
	    var inplaceMethodWithOneArgMatrix = `
	(function %name%M(matrix) {
	    matrix = this.constructor.checkMatrix(matrix);
	    checkDimensions(this, matrix);
	    for (var i = 0; i < this.rows; i++) {
	        for (var j = 0; j < this.columns; j++) {
	            this.set(i, j, %method%(this.get(i, j), matrix.get(i, j)));
	        }
	    }
	    return this;
	})
	`;

	    var inplaceMethodWithOneArg = `
	(function %name%(value) {
	    if (typeof value === 'number') return this.%name%S(value);
	    return this.%name%M(value);
	})
	`;

	    var staticMethodWithOneArg = staticMethodWithArgs;

	    var operators = [
	        // Arithmetic operators
	        ['+', 'add'],
	        ['-', 'sub', 'subtract'],
	        ['*', 'mul', 'multiply'],
	        ['/', 'div', 'divide'],
	        ['%', 'mod', 'modulus'],
	        // Bitwise operators
	        ['&', 'and'],
	        ['|', 'or'],
	        ['^', 'xor'],
	        ['<<', 'leftShift'],
	        ['>>', 'signPropagatingRightShift'],
	        ['>>>', 'rightShift', 'zeroFillRightShift']
	    ];

	    for (var operator of operators) {
	        var inplaceOp = eval(fillTemplateFunction(inplaceOperator, {name: operator[1], op: operator[0]}));
	        var inplaceOpS = eval(fillTemplateFunction(inplaceOperatorScalar, {name: operator[1] + 'S', op: operator[0]}));
	        var inplaceOpM = eval(fillTemplateFunction(inplaceOperatorMatrix, {name: operator[1] + 'M', op: operator[0]}));
	        var staticOp = eval(fillTemplateFunction(staticOperator, {name: operator[1]}));
	        for (var i = 1; i < operator.length; i++) {
	            Matrix.prototype[operator[i]] = inplaceOp;
	            Matrix.prototype[operator[i] + 'S'] = inplaceOpS;
	            Matrix.prototype[operator[i] + 'M'] = inplaceOpM;
	            Matrix[operator[i]] = staticOp;
	        }
	    }

	    var methods = [
	        ['~', 'not']
	    ];

	    [
	        'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cbrt', 'ceil',
	        'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'log', 'log1p',
	        'log10', 'log2', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc'
	    ].forEach(function (mathMethod) {
	        methods.push(['Math.' + mathMethod, mathMethod]);
	    });

	    for (var method of methods) {
	        var inplaceMeth = eval(fillTemplateFunction(inplaceMethod, {name: method[1], method: method[0]}));
	        var staticMeth = eval(fillTemplateFunction(staticMethod, {name: method[1]}));
	        for (var i = 1; i < method.length; i++) {
	            Matrix.prototype[method[i]] = inplaceMeth;
	            Matrix[method[i]] = staticMeth;
	        }
	    }

	    var methodsWithArgs = [
	        ['Math.pow', 1, 'pow']
	    ];

	    for (var methodWithArg of methodsWithArgs) {
	        var args = 'arg0';
	        for (var i = 1; i < methodWithArg[1]; i++) {
	            args += `, arg${i}`;
	        }
	        if (methodWithArg[1] !== 1) {
	            var inplaceMethWithArgs = eval(fillTemplateFunction(inplaceMethodWithArgs, {
	                name: methodWithArg[2],
	                method: methodWithArg[0],
	                args: args
	            }));
	            var staticMethWithArgs = eval(fillTemplateFunction(staticMethodWithArgs, {name: methodWithArg[2], args: args}));
	            for (var i = 2; i < methodWithArg.length; i++) {
	                Matrix.prototype[methodWithArg[i]] = inplaceMethWithArgs;
	                Matrix[methodWithArg[i]] = staticMethWithArgs;
	            }
	        } else {
	            var tmplVar = {
	                name: methodWithArg[2],
	                args: args,
	                method: methodWithArg[0]
	            };
	            var inplaceMethod = eval(fillTemplateFunction(inplaceMethodWithOneArg, tmplVar));
	            var inplaceMethodS = eval(fillTemplateFunction(inplaceMethodWithOneArgScalar, tmplVar));
	            var inplaceMethodM = eval(fillTemplateFunction(inplaceMethodWithOneArgMatrix, tmplVar));
	            var staticMethod = eval(fillTemplateFunction(staticMethodWithOneArg, tmplVar));
	            for (var i = 2; i < methodWithArg.length; i++) {
	                Matrix.prototype[methodWithArg[i]] = inplaceMethod;
	                Matrix.prototype[methodWithArg[i] + 'M'] = inplaceMethodM;
	                Matrix.prototype[methodWithArg[i] + 'S'] = inplaceMethodS;
	                Matrix[methodWithArg[i]] = staticMethod;
	            }
	        }
	    }

	    function fillTemplateFunction(template, values) {
	        for (var i in values) {
	            template = template.replace(new RegExp('%' + i + '%', 'g'), values[i]);
	        }
	        return template;
	    }

	    return Matrix;
	}


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = exports = __webpack_require__(7);
	exports.getEquallySpacedData = __webpack_require__(11).getEquallySpacedData;
	exports.SNV = __webpack_require__(12).SNV;
	exports.binarySearch = __webpack_require__(13);


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const Stat = __webpack_require__(8).array;
	/**
	 * Function that returns an array of points given 1D array as follows:
	 *
	 * [x1, y1, .. , x2, y2, ..]
	 *
	 * And receive the number of dimensions of each point.
	 * @param array
	 * @param dimensions
	 * @returns {Array} - Array of points.
	 */
	function coordArrayToPoints(array, dimensions) {
	    if(array.length % dimensions !== 0) {
	        throw new RangeError('Dimensions number must be accordance with the size of the array.');
	    }

	    var length = array.length / dimensions;
	    var pointsArr = new Array(length);

	    var k = 0;
	    for(var i = 0; i < array.length; i += dimensions) {
	        var point = new Array(dimensions);
	        for(var j = 0; j < dimensions; ++j) {
	            point[j] = array[i + j];
	        }

	        pointsArr[k] = point;
	        k++;
	    }

	    return pointsArr;
	}


	/**
	 * Function that given an array as follows:
	 * [x1, y1, .. , x2, y2, ..]
	 *
	 * Returns an array as follows:
	 * [[x1, x2, ..], [y1, y2, ..], [ .. ]]
	 *
	 * And receives the number of dimensions of each coordinate.
	 * @param array
	 * @param dimensions
	 * @returns {Array} - Matrix of coordinates
	 */
	function coordArrayToCoordMatrix(array, dimensions) {
	    if(array.length % dimensions !== 0) {
	        throw new RangeError('Dimensions number must be accordance with the size of the array.');
	    }

	    var coordinatesArray = new Array(dimensions);
	    var points = array.length / dimensions;
	    for (var i = 0; i < coordinatesArray.length; i++) {
	        coordinatesArray[i] = new Array(points);
	    }

	    for(i = 0; i < array.length; i += dimensions) {
	        for(var j = 0; j < dimensions; ++j) {
	            var currentPoint = Math.floor(i / dimensions);
	            coordinatesArray[j][currentPoint] = array[i + j];
	        }
	    }

	    return coordinatesArray;
	}

	/**
	 * Function that receives a coordinate matrix as follows:
	 * [[x1, x2, ..], [y1, y2, ..], [ .. ]]
	 *
	 * Returns an array of coordinates as follows:
	 * [x1, y1, .. , x2, y2, ..]
	 *
	 * @param coordMatrix
	 * @returns {Array}
	 */
	function coordMatrixToCoordArray(coordMatrix) {
	    var coodinatesArray = new Array(coordMatrix.length * coordMatrix[0].length);
	    var k = 0;
	    for(var i = 0; i < coordMatrix[0].length; ++i) {
	        for(var j = 0; j < coordMatrix.length; ++j) {
	            coodinatesArray[k] = coordMatrix[j][i];
	            ++k;
	        }
	    }

	    return coodinatesArray;
	}

	/**
	 * Tranpose a matrix, this method is for coordMatrixToPoints and
	 * pointsToCoordMatrix, that because only transposing the matrix
	 * you can change your representation.
	 *
	 * @param matrix
	 * @returns {Array}
	 */
	function transpose(matrix) {
	    var resultMatrix = new Array(matrix[0].length);
	    for(var i = 0; i < resultMatrix.length; ++i) {
	        resultMatrix[i] = new Array(matrix.length);
	    }

	    for (i = 0; i < matrix.length; ++i) {
	        for(var j = 0; j < matrix[0].length; ++j) {
	            resultMatrix[j][i] = matrix[i][j];
	        }
	    }

	    return resultMatrix;
	}

	/**
	 * Function that transform an array of points into a coordinates array
	 * as follows:
	 * [x1, y1, .. , x2, y2, ..]
	 *
	 * @param points
	 * @returns {Array}
	 */
	function pointsToCoordArray(points) {
	    var coodinatesArray = new Array(points.length * points[0].length);
	    var k = 0;
	    for(var i = 0; i < points.length; ++i) {
	        for(var j = 0; j < points[0].length; ++j) {
	            coodinatesArray[k] = points[i][j];
	            ++k;
	        }
	    }

	    return coodinatesArray;
	}

	/**
	 * Apply the dot product between the smaller vector and a subsets of the
	 * largest one.
	 *
	 * @param firstVector
	 * @param secondVector
	 * @returns {Array} each dot product of size of the difference between the
	 *                  larger and the smallest one.
	 */
	function applyDotProduct(firstVector, secondVector) {
	    var largestVector, smallestVector;
	    if(firstVector.length <= secondVector.length) {
	        smallestVector = firstVector;
	        largestVector = secondVector;
	    } else {
	        smallestVector = secondVector;
	        largestVector = firstVector;
	    }

	    var difference = largestVector.length - smallestVector.length + 1;
	    var dotProductApplied = new Array(difference);

	    for (var i = 0; i < difference; ++i) {
	        var sum = 0;
	        for (var j = 0; j < smallestVector.length; ++j) {
	            sum += smallestVector[j] * largestVector[i + j];
	        }
	        dotProductApplied[i] = sum;
	    }

	    return dotProductApplied;
	}
	/**
	 * To scale the input array between the specified min and max values. The operation is performed inplace
	 * if the options.inplace is specified. If only one of the min or max parameters is specified, then the scaling
	 * will multiply the input array by min/min(input) or max/max(input)
	 * @param input
	 * @param options
	 * @returns {*}
	 */
	function scale(input, options){
	    var y;
	    if(options.inPlace){
	        y = input;
	    }
	    else{
	        y = new Array(input.length);
	    }
	    const max = options.max;
	    const min = options.min;
	    if(typeof max === "number"){
	        if(typeof min === "number"){
	            var minMax = Stat.minMax(input);
	            var factor = (max - min)/(minMax.max-minMax.min);
	            for(var i=0;i< y.length;i++){
	                y[i]=(input[i]-minMax.min)*factor+min;
	            }
	        }
	        else{
	            var currentMin = Stat.max(input);
	            var factor = max/currentMin;
	            for(var i=0;i< y.length;i++){
	                y[i] = input[i]*factor;
	            }
	        }
	    }
	    else{
	        if(typeof min === "number"){
	            var currentMin = Stat.min(input);
	            var factor = min/currentMin;
	            for(var i=0;i< y.length;i++){
	                y[i] = input[i]*factor;
	            }
	        }
	    }
	    return y;
	}

	module.exports = {
	    coordArrayToPoints: coordArrayToPoints,
	    coordArrayToCoordMatrix: coordArrayToCoordMatrix,
	    coordMatrixToCoordArray: coordMatrixToCoordArray,
	    coordMatrixToPoints: transpose,
	    pointsToCoordArray: pointsToCoordArray,
	    pointsToCoordMatrix: transpose,
	    applyDotProduct: applyDotProduct,
	    scale:scale
	};



/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.array = __webpack_require__(9);
	exports.matrix = __webpack_require__(10);


/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	function compareNumbers(a, b) {
	    return a - b;
	}

	/**
	 * Computes the sum of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.sum = function sum(values) {
	    var sum = 0;
	    for (var i = 0; i < values.length; i++) {
	        sum += values[i];
	    }
	    return sum;
	};

	/**
	 * Computes the maximum of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.max = function max(values) {
	    var max = values[0];
	    var l = values.length;
	    for (var i = 1; i < l; i++) {
	        if (values[i] > max) max = values[i];
	    }
	    return max;
	};

	/**
	 * Computes the minimum of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.min = function min(values) {
	    var min = values[0];
	    var l = values.length;
	    for (var i = 1; i < l; i++) {
	        if (values[i] < min) min = values[i];
	    }
	    return min;
	};

	/**
	 * Computes the min and max of the given values
	 * @param {Array} values
	 * @returns {{min: number, max: number}}
	 */
	exports.minMax = function minMax(values) {
	    var min = values[0];
	    var max = values[0];
	    var l = values.length;
	    for (var i = 1; i < l; i++) {
	        if (values[i] < min) min = values[i];
	        if (values[i] > max) max = values[i];
	    }
	    return {
	        min: min,
	        max: max
	    };
	};

	/**
	 * Computes the arithmetic mean of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.arithmeticMean = function arithmeticMean(values) {
	    var sum = 0;
	    var l = values.length;
	    for (var i = 0; i < l; i++) {
	        sum += values[i];
	    }
	    return sum / l;
	};

	/**
	 * {@link arithmeticMean}
	 */
	exports.mean = exports.arithmeticMean;

	/**
	 * Computes the geometric mean of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.geometricMean = function geometricMean(values) {
	    var mul = 1;
	    var l = values.length;
	    for (var i = 0; i < l; i++) {
	        mul *= values[i];
	    }
	    return Math.pow(mul, 1 / l);
	};

	/**
	 * Computes the mean of the log of the given values
	 * If the return value is exponentiated, it gives the same result as the
	 * geometric mean.
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.logMean = function logMean(values) {
	    var lnsum = 0;
	    var l = values.length;
	    for (var i = 0; i < l; i++) {
	        lnsum += Math.log(values[i]);
	    }
	    return lnsum / l;
	};

	/**
	 * Computes the weighted grand mean for a list of means and sample sizes
	 * @param {Array} means - Mean values for each set of samples
	 * @param {Array} samples - Number of original values for each set of samples
	 * @returns {number}
	 */
	exports.grandMean = function grandMean(means, samples) {
	    var sum = 0;
	    var n = 0;
	    var l = means.length;
	    for (var i = 0; i < l; i++) {
	        sum += samples[i] * means[i];
	        n += samples[i];
	    }
	    return sum / n;
	};

	/**
	 * Computes the truncated mean of the given values using a given percentage
	 * @param {Array} values
	 * @param {number} percent - The percentage of values to keep (range: [0,1])
	 * @param {boolean} [alreadySorted=false]
	 * @returns {number}
	 */
	exports.truncatedMean = function truncatedMean(values, percent, alreadySorted) {
	    if (alreadySorted === undefined) alreadySorted = false;
	    if (!alreadySorted) {
	        values = [].concat(values).sort(compareNumbers);
	    }
	    var l = values.length;
	    var k = Math.floor(l * percent);
	    var sum = 0;
	    for (var i = k; i < (l - k); i++) {
	        sum += values[i];
	    }
	    return sum / (l - 2 * k);
	};

	/**
	 * Computes the harmonic mean of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.harmonicMean = function harmonicMean(values) {
	    var sum = 0;
	    var l = values.length;
	    for (var i = 0; i < l; i++) {
	        if (values[i] === 0) {
	            throw new RangeError('value at index ' + i + 'is zero');
	        }
	        sum += 1 / values[i];
	    }
	    return l / sum;
	};

	/**
	 * Computes the contraharmonic mean of the given values
	 * @param {Array} values
	 * @returns {number}
	 */
	exports.contraHarmonicMean = function contraHarmonicMean(values) {
	    var r1 = 0;
	    var r2 = 0;
	    var l = values.length;
	    for (var i = 0; i < l; i++) {
	        r1 += values[i] * values[i];
	        r2 += values[i];
	    }
	    if (r2 < 0) {
	        throw new RangeError('sum of values is negative');
	    }
	    return r1 / r2;
	};

	/**
	 * Computes the median of the given values
	 * @param {Array} values
	 * @param {boolean} [alreadySorted=false]
	 * @returns {number}
	 */
	exports.median = function median(values, alreadySorted) {
	    if (alreadySorted === undefined) alreadySorted = false;
	    if (!alreadySorted) {
	        values = [].concat(values).sort(compareNumbers);
	    }
	    var l = values.length;
	    var half = Math.floor(l / 2);
	    if (l % 2 === 0) {
	        return (values[half - 1] + values[half]) * 0.5;
	    } else {
	        return values[half];
	    }
	};

	/**
	 * Computes the variance of the given values
	 * @param {Array} values
	 * @param {boolean} [unbiased=true] - if true, divide by (n-1); if false, divide by n.
	 * @returns {number}
	 */
	exports.variance = function variance(values, unbiased) {
	    if (unbiased === undefined) unbiased = true;
	    var theMean = exports.mean(values);
	    var theVariance = 0;
	    var l = values.length;

	    for (var i = 0; i < l; i++) {
	        var x = values[i] - theMean;
	        theVariance += x * x;
	    }

	    if (unbiased) {
	        return theVariance / (l - 1);
	    } else {
	        return theVariance / l;
	    }
	};

	/**
	 * Computes the standard deviation of the given values
	 * @param {Array} values
	 * @param {boolean} [unbiased=true] - if true, divide by (n-1); if false, divide by n.
	 * @returns {number}
	 */
	exports.standardDeviation = function standardDeviation(values, unbiased) {
	    return Math.sqrt(exports.variance(values, unbiased));
	};

	exports.standardError = function standardError(values) {
	    return exports.standardDeviation(values) / Math.sqrt(values.length);
	};

	/**
	 * IEEE Transactions on biomedical engineering, vol. 52, no. 1, january 2005, p. 76-
	 * Calculate the standard deviation via the Median of the absolute deviation
	 *  The formula for the standard deviation only holds for Gaussian random variables.
	 * @returns {{mean: number, stdev: number}}
	 */
	exports.robustMeanAndStdev = function robustMeanAndStdev(y) {
	    var mean = 0, stdev = 0;
	    var length = y.length, i = 0;
	    for (i = 0; i < length; i++) {
	        mean += y[i];
	    }
	    mean /= length;
	    var averageDeviations = new Array(length);
	    for (i = 0; i < length; i++)
	        averageDeviations[i] = Math.abs(y[i] - mean);
	    averageDeviations.sort(compareNumbers);
	    if (length % 2 === 1) {
	        stdev = averageDeviations[(length - 1) / 2] / 0.6745;
	    } else {
	        stdev = 0.5 * (averageDeviations[length / 2] + averageDeviations[length / 2 - 1]) / 0.6745;
	    }

	    return {mean, stdev};
	};

	exports.quartiles = function quartiles(values, alreadySorted) {
	    if (typeof (alreadySorted) === 'undefined') alreadySorted = false;
	    if (!alreadySorted) {
	        values = [].concat(values).sort(compareNumbers);
	    }

	    var quart = values.length / 4;
	    var q1 = values[Math.ceil(quart) - 1];
	    var q2 = exports.median(values, true);
	    var q3 = values[Math.ceil(quart * 3) - 1];

	    return {q1: q1, q2: q2, q3: q3};
	};

	exports.pooledStandardDeviation = function pooledStandardDeviation(samples, unbiased) {
	    return Math.sqrt(exports.pooledVariance(samples, unbiased));
	};

	exports.pooledVariance = function pooledVariance(samples, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var sum = 0;
	    var length = 0, l = samples.length;
	    for (var i = 0; i < l; i++) {
	        var values = samples[i];
	        var vari = exports.variance(values);

	        sum += (values.length - 1) * vari;

	        if (unbiased)
	            length += values.length - 1;
	        else
	            length += values.length;
	    }
	    return sum / length;
	};

	exports.mode = function mode(values) {
	    var l = values.length,
	        itemCount = new Array(l),
	        i;
	    for (i = 0; i < l; i++) {
	        itemCount[i] = 0;
	    }
	    var itemArray = new Array(l);
	    var count = 0;

	    for (i = 0; i < l; i++) {
	        var index = itemArray.indexOf(values[i]);
	        if (index >= 0)
	            itemCount[index]++;
	        else {
	            itemArray[count] = values[i];
	            itemCount[count] = 1;
	            count++;
	        }
	    }

	    var maxValue = 0, maxIndex = 0;
	    for (i = 0; i < count; i++) {
	        if (itemCount[i] > maxValue) {
	            maxValue = itemCount[i];
	            maxIndex = i;
	        }
	    }

	    return itemArray[maxIndex];
	};

	exports.covariance = function covariance(vector1, vector2, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var mean1 = exports.mean(vector1);
	    var mean2 = exports.mean(vector2);

	    if (vector1.length !== vector2.length)
	        throw 'Vectors do not have the same dimensions';

	    var cov = 0, l = vector1.length;
	    for (var i = 0; i < l; i++) {
	        var x = vector1[i] - mean1;
	        var y = vector2[i] - mean2;
	        cov += x * y;
	    }

	    if (unbiased)
	        return cov / (l - 1);
	    else
	        return cov / l;
	};

	exports.skewness = function skewness(values, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var theMean = exports.mean(values);

	    var s2 = 0, s3 = 0, l = values.length;
	    for (var i = 0; i < l; i++) {
	        var dev = values[i] - theMean;
	        s2 += dev * dev;
	        s3 += dev * dev * dev;
	    }
	    var m2 = s2 / l;
	    var m3 = s3 / l;

	    var g = m3 / (Math.pow(m2, 3 / 2.0));
	    if (unbiased) {
	        var a = Math.sqrt(l * (l - 1));
	        var b = l - 2;
	        return (a / b) * g;
	    } else {
	        return g;
	    }
	};

	exports.kurtosis = function kurtosis(values, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var theMean = exports.mean(values);
	    var n = values.length, s2 = 0, s4 = 0;

	    for (var i = 0; i < n; i++) {
	        var dev = values[i] - theMean;
	        s2 += dev * dev;
	        s4 += dev * dev * dev * dev;
	    }
	    var m2 = s2 / n;
	    var m4 = s4 / n;

	    if (unbiased) {
	        var v = s2 / (n - 1);
	        var a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
	        var b = s4 / (v * v);
	        var c = ((n - 1) * (n - 1)) / ((n - 2) * (n - 3));

	        return a * b - 3 * c;
	    } else {
	        return m4 / (m2 * m2) - 3;
	    }
	};

	exports.entropy = function entropy(values, eps) {
	    if (typeof (eps) === 'undefined') eps = 0;
	    var sum = 0, l = values.length;
	    for (var i = 0; i < l; i++)
	        sum += values[i] * Math.log(values[i] + eps);
	    return -sum;
	};

	exports.weightedMean = function weightedMean(values, weights) {
	    var sum = 0, l = values.length;
	    for (var i = 0; i < l; i++)
	        sum += values[i] * weights[i];
	    return sum;
	};

	exports.weightedStandardDeviation = function weightedStandardDeviation(values, weights) {
	    return Math.sqrt(exports.weightedVariance(values, weights));
	};

	exports.weightedVariance = function weightedVariance(values, weights) {
	    var theMean = exports.weightedMean(values, weights);
	    var vari = 0, l = values.length;
	    var a = 0, b = 0;

	    for (var i = 0; i < l; i++) {
	        var z = values[i] - theMean;
	        var w = weights[i];

	        vari += w * (z * z);
	        b += w;
	        a += w * w;
	    }

	    return vari * (b / (b * b - a));
	};

	exports.center = function center(values, inPlace) {
	    if (typeof (inPlace) === 'undefined') inPlace = false;

	    var result = values;
	    if (!inPlace)
	        result = [].concat(values);

	    var theMean = exports.mean(result), l = result.length;
	    for (var i = 0; i < l; i++)
	        result[i] -= theMean;
	};

	exports.standardize = function standardize(values, standardDev, inPlace) {
	    if (typeof (standardDev) === 'undefined') standardDev = exports.standardDeviation(values);
	    if (typeof (inPlace) === 'undefined') inPlace = false;
	    var l = values.length;
	    var result = inPlace ? values : new Array(l);
	    for (var i = 0; i < l; i++)
	        result[i] = values[i] / standardDev;
	    return result;
	};

	exports.cumulativeSum = function cumulativeSum(array) {
	    var l = array.length;
	    var result = new Array(l);
	    result[0] = array[0];
	    for (var i = 1; i < l; i++)
	        result[i] = result[i - 1] + array[i];
	    return result;
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var arrayStat = __webpack_require__(9);

	function compareNumbers(a, b) {
	    return a - b;
	}

	exports.max = function max(matrix) {
	    var max = -Infinity;
	    for (var i = 0; i < matrix.length; i++) {
	        for (var j = 0; j < matrix[i].length; j++) {
	            if (matrix[i][j] > max) max = matrix[i][j];
	        }
	    }
	    return max;
	};

	exports.min = function min(matrix) {
	    var min = Infinity;
	    for (var i = 0; i < matrix.length; i++) {
	        for (var j = 0; j < matrix[i].length; j++) {
	            if (matrix[i][j] < min) min = matrix[i][j];
	        }
	    }
	    return min;
	};

	exports.minMax = function minMax(matrix) {
	    var min = Infinity;
	    var max = -Infinity;
	    for (var i = 0; i < matrix.length; i++) {
	        for (var j = 0; j < matrix[i].length; j++) {
	            if (matrix[i][j] < min) min = matrix[i][j];
	            if (matrix[i][j] > max) max = matrix[i][j];
	        }
	    }
	    return {min, max};
	};

	exports.entropy = function entropy(matrix, eps) {
	    if (typeof (eps) === 'undefined') {
	        eps = 0;
	    }
	    var sum = 0,
	        l1 = matrix.length,
	        l2 = matrix[0].length;
	    for (var i = 0; i < l1; i++) {
	        for (var j = 0; j < l2; j++) {
	            sum += matrix[i][j] * Math.log(matrix[i][j] + eps);
	        }
	    }
	    return -sum;
	};

	exports.mean = function mean(matrix, dimension) {
	    if (typeof (dimension) === 'undefined') {
	        dimension = 0;
	    }
	    var rows = matrix.length,
	        cols = matrix[0].length,
	        theMean, N, i, j;

	    if (dimension === -1) {
	        theMean = [0];
	        N = rows * cols;
	        for (i = 0; i < rows; i++) {
	            for (j = 0; j < cols; j++) {
	                theMean[0] += matrix[i][j];
	            }
	        }
	        theMean[0] /= N;
	    } else if (dimension === 0) {
	        theMean = new Array(cols);
	        N = rows;
	        for (j = 0; j < cols; j++) {
	            theMean[j] = 0;
	            for (i = 0; i < rows; i++) {
	                theMean[j] += matrix[i][j];
	            }
	            theMean[j] /= N;
	        }
	    } else if (dimension === 1) {
	        theMean = new Array(rows);
	        N = cols;
	        for (j = 0; j < rows; j++) {
	            theMean[j] = 0;
	            for (i = 0; i < cols; i++) {
	                theMean[j] += matrix[j][i];
	            }
	            theMean[j] /= N;
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }
	    return theMean;
	};

	exports.sum = function sum(matrix, dimension) {
	    if (typeof (dimension) === 'undefined') {
	        dimension = 0;
	    }
	    var rows = matrix.length,
	        cols = matrix[0].length,
	        theSum, i, j;

	    if (dimension === -1) {
	        theSum = [0];
	        for (i = 0; i < rows; i++) {
	            for (j = 0; j < cols; j++) {
	                theSum[0] += matrix[i][j];
	            }
	        }
	    } else if (dimension === 0) {
	        theSum = new Array(cols);
	        for (j = 0; j < cols; j++) {
	            theSum[j] = 0;
	            for (i = 0; i < rows; i++) {
	                theSum[j] += matrix[i][j];
	            }
	        }
	    } else if (dimension === 1) {
	        theSum = new Array(rows);
	        for (j = 0; j < rows; j++) {
	            theSum[j] = 0;
	            for (i = 0; i < cols; i++) {
	                theSum[j] += matrix[j][i];
	            }
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }
	    return theSum;
	};

	exports.product = function product(matrix, dimension) {
	    if (typeof (dimension) === 'undefined') {
	        dimension = 0;
	    }
	    var rows = matrix.length,
	        cols = matrix[0].length,
	        theProduct, i, j;

	    if (dimension === -1) {
	        theProduct = [1];
	        for (i = 0; i < rows; i++) {
	            for (j = 0; j < cols; j++) {
	                theProduct[0] *= matrix[i][j];
	            }
	        }
	    } else if (dimension === 0) {
	        theProduct = new Array(cols);
	        for (j = 0; j < cols; j++) {
	            theProduct[j] = 1;
	            for (i = 0; i < rows; i++) {
	                theProduct[j] *= matrix[i][j];
	            }
	        }
	    } else if (dimension === 1) {
	        theProduct = new Array(rows);
	        for (j = 0; j < rows; j++) {
	            theProduct[j] = 1;
	            for (i = 0; i < cols; i++) {
	                theProduct[j] *= matrix[j][i];
	            }
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }
	    return theProduct;
	};

	exports.standardDeviation = function standardDeviation(matrix, means, unbiased) {
	    var vari = exports.variance(matrix, means, unbiased), l = vari.length;
	    for (var i = 0; i < l; i++) {
	        vari[i] = Math.sqrt(vari[i]);
	    }
	    return vari;
	};

	exports.variance = function variance(matrix, means, unbiased) {
	    if (typeof (unbiased) === 'undefined') {
	        unbiased = true;
	    }
	    means = means || exports.mean(matrix);
	    var rows = matrix.length;
	    if (rows === 0) return [];
	    var cols = matrix[0].length;
	    var vari = new Array(cols);

	    for (var j = 0; j < cols; j++) {
	        var sum1 = 0, sum2 = 0, x = 0;
	        for (var i = 0; i < rows; i++) {
	            x = matrix[i][j] - means[j];
	            sum1 += x;
	            sum2 += x * x;
	        }
	        if (unbiased) {
	            vari[j] = (sum2 - ((sum1 * sum1) / rows)) / (rows - 1);
	        } else {
	            vari[j] = (sum2 - ((sum1 * sum1) / rows)) / rows;
	        }
	    }
	    return vari;
	};

	exports.median = function median(matrix) {
	    var rows = matrix.length, cols = matrix[0].length;
	    var medians = new Array(cols);

	    for (var i = 0; i < cols; i++) {
	        var data = new Array(rows);
	        for (var j = 0; j < rows; j++) {
	            data[j] = matrix[j][i];
	        }
	        data.sort(compareNumbers);
	        var N = data.length;
	        if (N % 2 === 0) {
	            medians[i] = (data[N / 2] + data[(N / 2) - 1]) * 0.5;
	        } else {
	            medians[i] = data[Math.floor(N / 2)];
	        }
	    }
	    return medians;
	};

	exports.mode = function mode(matrix) {
	    var rows = matrix.length,
	        cols = matrix[0].length,
	        modes = new Array(cols),
	        i, j;
	    for (i = 0; i < cols; i++) {
	        var itemCount = new Array(rows);
	        for (var k = 0; k < rows; k++) {
	            itemCount[k] = 0;
	        }
	        var itemArray = new Array(rows);
	        var count = 0;

	        for (j = 0; j < rows; j++) {
	            var index = itemArray.indexOf(matrix[j][i]);
	            if (index >= 0) {
	                itemCount[index]++;
	            } else {
	                itemArray[count] = matrix[j][i];
	                itemCount[count] = 1;
	                count++;
	            }
	        }

	        var maxValue = 0, maxIndex = 0;
	        for (j = 0; j < count; j++) {
	            if (itemCount[j] > maxValue) {
	                maxValue = itemCount[j];
	                maxIndex = j;
	            }
	        }

	        modes[i] = itemArray[maxIndex];
	    }
	    return modes;
	};

	exports.skewness = function skewness(matrix, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var means = exports.mean(matrix);
	    var n = matrix.length, l = means.length;
	    var skew = new Array(l);

	    for (var j = 0; j < l; j++) {
	        var s2 = 0, s3 = 0;
	        for (var i = 0; i < n; i++) {
	            var dev = matrix[i][j] - means[j];
	            s2 += dev * dev;
	            s3 += dev * dev * dev;
	        }

	        var m2 = s2 / n;
	        var m3 = s3 / n;
	        var g = m3 / Math.pow(m2, 3 / 2);

	        if (unbiased) {
	            var a = Math.sqrt(n * (n - 1));
	            var b = n - 2;
	            skew[j] = (a / b) * g;
	        } else {
	            skew[j] = g;
	        }
	    }
	    return skew;
	};

	exports.kurtosis = function kurtosis(matrix, unbiased) {
	    if (typeof (unbiased) === 'undefined') unbiased = true;
	    var means = exports.mean(matrix);
	    var n = matrix.length, m = matrix[0].length;
	    var kurt = new Array(m);

	    for (var j = 0; j < m; j++) {
	        var s2 = 0, s4 = 0;
	        for (var i = 0; i < n; i++) {
	            var dev = matrix[i][j] - means[j];
	            s2 += dev * dev;
	            s4 += dev * dev * dev * dev;
	        }
	        var m2 = s2 / n;
	        var m4 = s4 / n;

	        if (unbiased) {
	            var v = s2 / (n - 1);
	            var a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
	            var b = s4 / (v * v);
	            var c = ((n - 1) * (n - 1)) / ((n - 2) * (n - 3));
	            kurt[j] = a * b - 3 * c;
	        } else {
	            kurt[j] = m4 / (m2 * m2) - 3;
	        }
	    }
	    return kurt;
	};

	exports.standardError = function standardError(matrix) {
	    var samples = matrix.length;
	    var standardDeviations = exports.standardDeviation(matrix);
	    var l = standardDeviations.length;
	    var standardErrors = new Array(l);
	    var sqrtN = Math.sqrt(samples);

	    for (var i = 0; i < l; i++) {
	        standardErrors[i] = standardDeviations[i] / sqrtN;
	    }
	    return standardErrors;
	};

	exports.covariance = function covariance(matrix, dimension) {
	    return exports.scatter(matrix, undefined, dimension);
	};

	exports.scatter = function scatter(matrix, divisor, dimension) {
	    if (typeof (dimension) === 'undefined') {
	        dimension = 0;
	    }
	    if (typeof (divisor) === 'undefined') {
	        if (dimension === 0) {
	            divisor = matrix.length - 1;
	        } else if (dimension === 1) {
	            divisor = matrix[0].length - 1;
	        }
	    }
	    var means = exports.mean(matrix, dimension);
	    var rows = matrix.length;
	    if (rows === 0) {
	        return [[]];
	    }
	    var cols = matrix[0].length,
	        cov, i, j, s, k;

	    if (dimension === 0) {
	        cov = new Array(cols);
	        for (i = 0; i < cols; i++) {
	            cov[i] = new Array(cols);
	        }
	        for (i = 0; i < cols; i++) {
	            for (j = i; j < cols; j++) {
	                s = 0;
	                for (k = 0; k < rows; k++) {
	                    s += (matrix[k][j] - means[j]) * (matrix[k][i] - means[i]);
	                }
	                s /= divisor;
	                cov[i][j] = s;
	                cov[j][i] = s;
	            }
	        }
	    } else if (dimension === 1) {
	        cov = new Array(rows);
	        for (i = 0; i < rows; i++) {
	            cov[i] = new Array(rows);
	        }
	        for (i = 0; i < rows; i++) {
	            for (j = i; j < rows; j++) {
	                s = 0;
	                for (k = 0; k < cols; k++) {
	                    s += (matrix[j][k] - means[j]) * (matrix[i][k] - means[i]);
	                }
	                s /= divisor;
	                cov[i][j] = s;
	                cov[j][i] = s;
	            }
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }

	    return cov;
	};

	exports.correlation = function correlation(matrix) {
	    var means = exports.mean(matrix),
	        standardDeviations = exports.standardDeviation(matrix, true, means),
	        scores = exports.zScores(matrix, means, standardDeviations),
	        rows = matrix.length,
	        cols = matrix[0].length,
	        i, j;

	    var cor = new Array(cols);
	    for (i = 0; i < cols; i++) {
	        cor[i] = new Array(cols);
	    }
	    for (i = 0; i < cols; i++) {
	        for (j = i; j < cols; j++) {
	            var c = 0;
	            for (var k = 0, l = scores.length; k < l; k++) {
	                c += scores[k][j] * scores[k][i];
	            }
	            c /= rows - 1;
	            cor[i][j] = c;
	            cor[j][i] = c;
	        }
	    }
	    return cor;
	};

	exports.zScores = function zScores(matrix, means, standardDeviations) {
	    means = means || exports.mean(matrix);
	    if (typeof (standardDeviations) === 'undefined') standardDeviations = exports.standardDeviation(matrix, true, means);
	    return exports.standardize(exports.center(matrix, means, false), standardDeviations, true);
	};

	exports.center = function center(matrix, means, inPlace) {
	    means = means || exports.mean(matrix);
	    var result = matrix,
	        l = matrix.length,
	        i, j, jj;

	    if (!inPlace) {
	        result = new Array(l);
	        for (i = 0; i < l; i++) {
	            result[i] = new Array(matrix[i].length);
	        }
	    }

	    for (i = 0; i < l; i++) {
	        var row = result[i];
	        for (j = 0, jj = row.length; j < jj; j++) {
	            row[j] = matrix[i][j] - means[j];
	        }
	    }
	    return result;
	};

	exports.standardize = function standardize(matrix, standardDeviations, inPlace) {
	    if (typeof (standardDeviations) === 'undefined') standardDeviations = exports.standardDeviation(matrix);
	    var result = matrix,
	        l = matrix.length,
	        i, j, jj;

	    if (!inPlace) {
	        result = new Array(l);
	        for (i = 0; i < l; i++) {
	            result[i] = new Array(matrix[i].length);
	        }
	    }

	    for (i = 0; i < l; i++) {
	        var resultRow = result[i];
	        var sourceRow = matrix[i];
	        for (j = 0, jj = resultRow.length; j < jj; j++) {
	            if (standardDeviations[j] !== 0 && !isNaN(standardDeviations[j])) {
	                resultRow[j] = sourceRow[j] / standardDeviations[j];
	            }
	        }
	    }
	    return result;
	};

	exports.weightedVariance = function weightedVariance(matrix, weights) {
	    var means = exports.mean(matrix);
	    var rows = matrix.length;
	    if (rows === 0) return [];
	    var cols = matrix[0].length;
	    var vari = new Array(cols);

	    for (var j = 0; j < cols; j++) {
	        var sum = 0;
	        var a = 0, b = 0;

	        for (var i = 0; i < rows; i++) {
	            var z = matrix[i][j] - means[j];
	            var w = weights[i];

	            sum += w * (z * z);
	            b += w;
	            a += w * w;
	        }

	        vari[j] = sum * (b / (b * b - a));
	    }

	    return vari;
	};

	exports.weightedMean = function weightedMean(matrix, weights, dimension) {
	    if (typeof (dimension) === 'undefined') {
	        dimension = 0;
	    }
	    var rows = matrix.length;
	    if (rows === 0) return [];
	    var cols = matrix[0].length,
	        means, i, ii, j, w, row;

	    if (dimension === 0) {
	        means = new Array(cols);
	        for (i = 0; i < cols; i++) {
	            means[i] = 0;
	        }
	        for (i = 0; i < rows; i++) {
	            row = matrix[i];
	            w = weights[i];
	            for (j = 0; j < cols; j++) {
	                means[j] += row[j] * w;
	            }
	        }
	    } else if (dimension === 1) {
	        means = new Array(rows);
	        for (i = 0; i < rows; i++) {
	            means[i] = 0;
	        }
	        for (j = 0; j < rows; j++) {
	            row = matrix[j];
	            w = weights[j];
	            for (i = 0; i < cols; i++) {
	                means[j] += row[i] * w;
	            }
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }

	    var weightSum = arrayStat.sum(weights);
	    if (weightSum !== 0) {
	        for (i = 0, ii = means.length; i < ii; i++) {
	            means[i] /= weightSum;
	        }
	    }
	    return means;
	};

	exports.weightedCovariance = function weightedCovariance(matrix, weights, means, dimension) {
	    dimension = dimension || 0;
	    means = means || exports.weightedMean(matrix, weights, dimension);
	    var s1 = 0, s2 = 0;
	    for (var i = 0, ii = weights.length; i < ii; i++) {
	        s1 += weights[i];
	        s2 += weights[i] * weights[i];
	    }
	    var factor = s1 / (s1 * s1 - s2);
	    return exports.weightedScatter(matrix, weights, means, factor, dimension);
	};

	exports.weightedScatter = function weightedScatter(matrix, weights, means, factor, dimension) {
	    dimension = dimension || 0;
	    means = means || exports.weightedMean(matrix, weights, dimension);
	    if (typeof (factor) === 'undefined') {
	        factor = 1;
	    }
	    var rows = matrix.length;
	    if (rows === 0) {
	        return [[]];
	    }
	    var cols = matrix[0].length,
	        cov, i, j, k, s;

	    if (dimension === 0) {
	        cov = new Array(cols);
	        for (i = 0; i < cols; i++) {
	            cov[i] = new Array(cols);
	        }
	        for (i = 0; i < cols; i++) {
	            for (j = i; j < cols; j++) {
	                s = 0;
	                for (k = 0; k < rows; k++) {
	                    s += weights[k] * (matrix[k][j] - means[j]) * (matrix[k][i] - means[i]);
	                }
	                cov[i][j] = s * factor;
	                cov[j][i] = s * factor;
	            }
	        }
	    } else if (dimension === 1) {
	        cov = new Array(rows);
	        for (i = 0; i < rows; i++) {
	            cov[i] = new Array(rows);
	        }
	        for (i = 0; i < rows; i++) {
	            for (j = i; j < rows; j++) {
	                s = 0;
	                for (k = 0; k < cols; k++) {
	                    s += weights[k] * (matrix[j][k] - means[j]) * (matrix[i][k] - means[i]);
	                }
	                cov[i][j] = s * factor;
	                cov[j][i] = s * factor;
	            }
	        }
	    } else {
	        throw new Error('Invalid dimension');
	    }

	    return cov;
	};


/***/ },
/* 11 */
/***/ function(module, exports) {

	'use strict';

	/**
	 *
	 * Function that returns a Number array of equally spaced numberOfPoints
	 * containing a representation of intensities of the spectra arguments x
	 * and y.
	 *
	 * The options parameter contains an object in the following form:
	 * from: starting point
	 * to: last point
	 * numberOfPoints: number of points between from and to
	 * variant: "slot" or "smooth" - smooth is the default option
	 *
	 * The slot variant consist that each point in the new array is calculated
	 * averaging the existing points between the slot that belongs to the current
	 * value. The smooth variant is the same but takes the integral of the range
	 * of the slot and divide by the step size between two points in the new array.
	 *
	 * @param x - sorted increasing x values
	 * @param y
	 * @param options
	 * @returns {Array} new array with the equally spaced data.
	 *
	 */
	function getEquallySpacedData(x, y, options) {
	    if (x.length>1 && x[0]>x[1]) {
	        x=x.slice().reverse();
	        y=y.slice().reverse();
	    }

	    var xLength = x.length;
	    if(xLength !== y.length)
	        throw new RangeError("the x and y vector doesn't have the same size.");

	    if (options === undefined) options = {};

	    var from = options.from === undefined ? x[0] : options.from
	    if (isNaN(from) || !isFinite(from)) {
	        throw new RangeError("'From' value must be a number");
	    }
	    var to = options.to === undefined ? x[x.length - 1] : options.to;
	    if (isNaN(to) || !isFinite(to)) {
	        throw new RangeError("'To' value must be a number");
	    }

	    var reverse = from > to;
	    if(reverse) {
	        var temp = from;
	        from = to;
	        to = temp;
	    }

	    var numberOfPoints = options.numberOfPoints === undefined ? 100 : options.numberOfPoints;
	    if (isNaN(numberOfPoints) || !isFinite(numberOfPoints)) {
	        throw new RangeError("'Number of points' value must be a number");
	    }
	    if(numberOfPoints < 1)
	        throw new RangeError("the number of point must be higher than 1");

	    var algorithm = options.variant === "slot" ? "slot" : "smooth"; // default value: smooth

	    var output = algorithm === "slot" ? getEquallySpacedSlot(x, y, from, to, numberOfPoints) : getEquallySpacedSmooth(x, y, from, to, numberOfPoints);

	    return reverse ? output.reverse() : output;
	}

	/**
	 * function that retrieves the getEquallySpacedData with the variant "smooth"
	 *
	 * @param x
	 * @param y
	 * @param from - Initial point
	 * @param to - Final point
	 * @param numberOfPoints
	 * @returns {Array} - Array of y's equally spaced with the variant "smooth"
	 */
	function getEquallySpacedSmooth(x, y, from, to, numberOfPoints) {
	    var xLength = x.length;

	    var step = (to - from) / (numberOfPoints - 1);
	    var halfStep = step / 2;

	    var start = from - halfStep;
	    var output = new Array(numberOfPoints);

	    var initialOriginalStep = x[1] - x[0];
	    var lastOriginalStep = x[x.length - 1] - x[x.length - 2];

	    // Init main variables
	    var min = start;
	    var max = start + step;

	    var previousX = Number.MIN_VALUE;
	    var previousY = 0;
	    var nextX = x[0] - initialOriginalStep;
	    var nextY = 0;

	    var currentValue = 0;
	    var slope = 0;
	    var intercept = 0;
	    var sumAtMin = 0;
	    var sumAtMax = 0;

	    var i = 0; // index of input
	    var j = 0; // index of output

	    function getSlope(x0, y0, x1, y1) {
	        return (y1 - y0) / (x1 - x0);
	    }

	    main: while(true) {
	        while (nextX - max >= 0) {
	            // no overlap with original point, just consume current value
	            var add = integral(0, max - previousX, slope, previousY);
	            sumAtMax = currentValue + add;

	            output[j] = (sumAtMax - sumAtMin) / step;
	            j++;

	            if (j === numberOfPoints)
	                break main;

	            min = max;
	            max += step;
	            sumAtMin = sumAtMax;
	        }

	        if(previousX <= min && min <= nextX) {
	            add = integral(0, min - previousX, slope, previousY);
	            sumAtMin = currentValue + add;
	        }

	        currentValue += integral(previousX, nextX, slope, intercept);

	        previousX = nextX;
	        previousY = nextY;

	        if (i < xLength) {
	            nextX = x[i];
	            nextY = y[i];
	            i++;
	        } else if (i === xLength) {
	            nextX += lastOriginalStep;
	            nextY = 0;
	        }
	        // updating parameters
	        slope = getSlope(previousX, previousY, nextX, nextY);
	        intercept = -slope*previousX + previousY;
	    }

	    return output;
	}

	/**
	 * function that retrieves the getEquallySpacedData with the variant "slot"
	 *
	 * @param x
	 * @param y
	 * @param from - Initial point
	 * @param to - Final point
	 * @param numberOfPoints
	 * @returns {Array} - Array of y's equally spaced with the variant "slot"
	 */
	function getEquallySpacedSlot(x, y, from, to, numberOfPoints) {
	    var xLength = x.length;

	    var step = (to - from) / (numberOfPoints - 1);
	    var halfStep = step / 2;
	    var lastStep = x[x.length - 1] - x[x.length - 2];

	    var start = from - halfStep;
	    var output = new Array(numberOfPoints);

	    // Init main variables
	    var min = start;
	    var max = start + step;

	    var previousX = -Number.MAX_VALUE;
	    var previousY = 0;
	    var nextX = x[0];
	    var nextY = y[0];
	    var frontOutsideSpectra = 0;
	    var backOutsideSpectra = true;

	    var currentValue = 0;

	    // for slot algorithm
	    var currentPoints = 0;

	    var i = 1; // index of input
	    var j = 0; // index of output

	    main: while(true) {
	        if (previousX>=nextX) throw (new Error('x must be an increasing serie'));
	        while (previousX - max > 0) {
	            // no overlap with original point, just consume current value
	            if(backOutsideSpectra) {
	                currentPoints++;
	                backOutsideSpectra = false;
	            }

	            output[j] = currentPoints <= 0 ? 0 : currentValue / currentPoints;
	            j++;

	            if (j === numberOfPoints)
	                break main;

	            min = max;
	            max += step;
	            currentValue = 0;
	            currentPoints = 0;
	        }

	        if(previousX > min) {
	            currentValue += previousY;
	            currentPoints++;
	        }

	        if(previousX === -Number.MAX_VALUE || frontOutsideSpectra > 1)
	            currentPoints--;

	        previousX = nextX;
	        previousY = nextY;

	        if (i < xLength) {
	            nextX = x[i];
	            nextY = y[i];
	            i++;
	        } else {
	            nextX += lastStep;
	            nextY = 0;
	            frontOutsideSpectra++;
	        }
	    }

	    return output;
	}
	/**
	 * Function that calculates the integral of the line between two
	 * x-coordinates, given the slope and intercept of the line.
	 *
	 * @param x0
	 * @param x1
	 * @param slope
	 * @param intercept
	 * @returns {number} integral value.
	 */
	function integral(x0, x1, slope, intercept) {
	    return (0.5 * slope * x1 * x1 + intercept * x1) - (0.5 * slope * x0 * x0 + intercept * x0);
	}

	exports.getEquallySpacedData = getEquallySpacedData;
	exports.integral = integral;

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.SNV = SNV;
	var Stat = __webpack_require__(8).array;

	/**
	 * Function that applies the standard normal variate (SNV) to an array of values.
	 *
	 * @param data - Array of values.
	 * @returns {Array} - applied the SNV.
	 */
	function SNV(data) {
	    var mean = Stat.mean(data);
	    var std = Stat.standardDeviation(data);
	    var result = data.slice();
	    for (var i = 0; i < data.length; i++) {
	        result[i] = (result[i] - mean) / std;
	    }
	    return result;
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	/**
	 * Performs a binary search of value in array
	 * @param array - Array in which value will be searched. It must be sorted.
	 * @param value - Value to search in array
	 * @return {number} If value is found, returns its index in array. Otherwise, returns a negative number indicating where the value should be inserted: -(index + 1)
	 */
	function binarySearch(array, value) {
	    var low = 0;
	    var high = array.length - 1;

	    while (low <= high) {
	        var mid = (low + high) >>> 1;
	        var midValue = array[mid];
	        if (midValue < value) {
	            low = mid + 1;
	        } else if (midValue > value) {
	            high = mid - 1;
	        } else {
	            return mid;
	        }
	    }

	    return -(low + 1);
	}

	module.exports = binarySearch;


/***/ },
/* 14 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * @private
	 * Check that a row index is not out of bounds
	 * @param {Matrix} matrix
	 * @param {number} index
	 * @param {boolean} [outer]
	 */
	exports.checkRowIndex = function checkRowIndex(matrix, index, outer) {
	    var max = outer ? matrix.rows : matrix.rows - 1;
	    if (index < 0 || index > max) {
	        throw new RangeError('Row index out of range');
	    }
	};

	/**
	 * @private
	 * Check that a column index is not out of bounds
	 * @param {Matrix} matrix
	 * @param {number} index
	 * @param {boolean} [outer]
	 */
	exports.checkColumnIndex = function checkColumnIndex(matrix, index, outer) {
	    var max = outer ? matrix.columns : matrix.columns - 1;
	    if (index < 0 || index > max) {
	        throw new RangeError('Column index out of range');
	    }
	};

	/**
	 * @private
	 * Check that the provided vector is an array with the right length
	 * @param {Matrix} matrix
	 * @param {Array|Matrix} vector
	 * @returns {Array}
	 * @throws {RangeError}
	 */
	exports.checkRowVector = function checkRowVector(matrix, vector) {
	    if (vector.to1DArray) {
	        vector = vector.to1DArray();
	    }
	    if (vector.length !== matrix.columns) {
	        throw new RangeError('vector size must be the same as the number of columns');
	    }
	    return vector;
	};

	/**
	 * @private
	 * Check that the provided vector is an array with the right length
	 * @param {Matrix} matrix
	 * @param {Array|Matrix} vector
	 * @returns {Array}
	 * @throws {RangeError}
	 */
	exports.checkColumnVector = function checkColumnVector(matrix, vector) {
	    if (vector.to1DArray) {
	        vector = vector.to1DArray();
	    }
	    if (vector.length !== matrix.rows) {
	        throw new RangeError('vector size must be the same as the number of rows');
	    }
	    return vector;
	};

	exports.checkIndices = function checkIndices(matrix, rowIndices, columnIndices) {
	    var rowOut = rowIndices.some(r => {
	        return r < 0 || r >= matrix.rows;

	    });

	    var columnOut = columnIndices.some(c => {
	        return c < 0 || c >= matrix.columns;
	    });

	    if (rowOut || columnOut) {
	        throw new RangeError('Indices are out of range')
	    }

	    if (typeof rowIndices !== 'object' || typeof columnIndices !== 'object') {
	        throw new TypeError('Unexpected type for row/column indices');
	    }
	    if (!Array.isArray(rowIndices)) rowIndices = Array.from(rowIndices);
	    if (!Array.isArray(columnIndices)) rowIndices = Array.from(columnIndices);

	    return {
	        row: rowIndices,
	        column: columnIndices
	    };
	};

	exports.checkRange = function checkRange(matrix, startRow, endRow, startColumn, endColumn) {
	    if (arguments.length !== 5) throw new TypeError('Invalid argument type');
	    var notAllNumbers = Array.from(arguments).slice(1).some(function (arg) {
	        return typeof arg !== 'number';
	    });
	    if (notAllNumbers) throw new TypeError('Invalid argument type');
	    if (startRow > endRow || startColumn > endColumn || startRow < 0 || startRow >= matrix.rows || endRow < 0 || endRow >= matrix.rows || startColumn < 0 || startColumn >= matrix.columns || endColumn < 0 || endColumn >= matrix.columns) {
	        throw new RangeError('Submatrix indices are out of range');
	    }
	};

	exports.getRange = function getRange(from, to) {
	    var arr = new Array(to - from + 1);
	    for (var i = 0; i < arr.length; i++) {
	        arr[i] = from + i;
	    }
	    return arr;
	};


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);

	class MatrixTransposeView extends BaseView {
	    constructor(matrix) {
	        super(matrix, matrix.columns, matrix.rows);
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(columnIndex, rowIndex, value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(columnIndex, rowIndex);
	    }
	}

	module.exports = MatrixTransposeView;


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var abstractMatrix = __webpack_require__(5);
	var Matrix;

	class BaseView extends abstractMatrix() {
	    constructor(matrix, rows, columns) {
	        super();
	        this.matrix = matrix;
	        this.rows = rows;
	        this.columns = columns;
	    }

	    static get [Symbol.species]() {
	        if (!Matrix) {
	            Matrix = __webpack_require__(3);
	        }
	        return Matrix;
	    }
	}

	module.exports = BaseView;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);

	class MatrixRowView extends BaseView {
	    constructor(matrix, row) {
	        super(matrix, 1, matrix.columns);
	        this.row = row;
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(this.row, columnIndex, value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(this.row, columnIndex);
	    }
	}

	module.exports = MatrixRowView;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);
	var util = __webpack_require__(14);

	class MatrixSubView extends BaseView {
	    constructor(matrix, startRow, endRow, startColumn, endColumn) {
	        util.checkRange(matrix, startRow, endRow, startColumn, endColumn);
	        super(matrix, endRow - startRow + 1, endColumn - startColumn + 1);
	        this.startRow = startRow;
	        this.startColumn = startColumn;
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(this.startRow + rowIndex, this.startColumn + columnIndex , value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(this.startRow + rowIndex, this.startColumn + columnIndex);
	    }
	}

	module.exports = MatrixSubView;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);
	var util = __webpack_require__(14);

	class MatrixSelectionView extends BaseView {
	    constructor(matrix, rowIndices, columnIndices) {
	        var indices = util.checkIndices(matrix, rowIndices, columnIndices);
	        super(matrix, indices.row.length, indices.column.length);
	        this.rowIndices = indices.row;
	        this.columnIndices = indices.column;
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(this.rowIndices[rowIndex], this.columnIndices[columnIndex] , value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(this.rowIndices[rowIndex], this.columnIndices[columnIndex]);
	    }
	}

	module.exports = MatrixSelectionView;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);

	class MatrixColumnView extends BaseView {
	    constructor(matrix, column) {
	        super(matrix, matrix.rows, 1);
	        this.column = column;
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(rowIndex, this.column, value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(rowIndex, this.column);
	    }
	}

	module.exports = MatrixColumnView;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);

	class MatrixFlipRowView extends BaseView {
	    constructor(matrix) {
	        super(matrix, matrix.rows, matrix.columns);
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(this.rows - rowIndex - 1, columnIndex, value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(this.rows - rowIndex - 1, columnIndex);
	    }
	}

	module.exports = MatrixFlipRowView;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var BaseView = __webpack_require__(16);

	class MatrixFlipColumnView extends BaseView {
	    constructor(matrix) {
	        super(matrix, matrix.rows, matrix.columns);
	    }

	    set(rowIndex, columnIndex, value) {
	        this.matrix.set(rowIndex, this.columns - columnIndex - 1, value);
	        return this;
	    }

	    get(rowIndex, columnIndex) {
	        return this.matrix.get(rowIndex, this.columns - columnIndex - 1);
	    }
	}

	module.exports = MatrixFlipColumnView;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(3);

	var SingularValueDecomposition = __webpack_require__(24);
	var EigenvalueDecomposition = __webpack_require__(26);
	var LuDecomposition = __webpack_require__(27);
	var QrDecomposition = __webpack_require__(28);
	var CholeskyDecomposition = __webpack_require__(29);

	function inverse(matrix) {
	    matrix = Matrix.checkMatrix(matrix);
	    return solve(matrix, Matrix.eye(matrix.rows));
	}

	Matrix.inverse = Matrix.inv = inverse;
	Matrix.prototype.inverse = Matrix.prototype.inv = function () {
	    return inverse(this);
	};

	function solve(leftHandSide, rightHandSide) {
	    leftHandSide = Matrix.checkMatrix(leftHandSide);
	    rightHandSide = Matrix.checkMatrix(rightHandSide);
	    return leftHandSide.isSquare() ? new LuDecomposition(leftHandSide).solve(rightHandSide) : new QrDecomposition(leftHandSide).solve(rightHandSide);
	}

	Matrix.solve = solve;
	Matrix.prototype.solve = function (other) {
	    return solve(this, other);
	};

	module.exports = {
	    SingularValueDecomposition: SingularValueDecomposition,
	    SVD: SingularValueDecomposition,
	    EigenvalueDecomposition: EigenvalueDecomposition,
	    EVD: EigenvalueDecomposition,
	    LuDecomposition: LuDecomposition,
	    LU: LuDecomposition,
	    QrDecomposition: QrDecomposition,
	    QR: QrDecomposition,
	    CholeskyDecomposition: CholeskyDecomposition,
	    CHO: CholeskyDecomposition,
	    inverse: inverse,
	    solve: solve
	};


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(3);
	var util = __webpack_require__(25);
	var hypotenuse = util.hypotenuse;
	var getFilled2DArray = util.getFilled2DArray;

	// https://github.com/lutzroeder/Mapack/blob/master/Source/SingularValueDecomposition.cs
	function SingularValueDecomposition(value, options) {
	    if (!(this instanceof SingularValueDecomposition)) {
	        return new SingularValueDecomposition(value, options);
	    }
	    value = Matrix.checkMatrix(value);

	    options = options || {};

	    var m = value.rows,
	        n = value.columns,
	        nu = Math.min(m, n);

	    var wantu = true, wantv = true;
	    if (options.computeLeftSingularVectors === false)
	        wantu = false;
	    if (options.computeRightSingularVectors === false)
	        wantv = false;
	    var autoTranspose = options.autoTranspose === true;

	    var swapped = false;
	    var a;
	    if (m < n) {
	        if (!autoTranspose) {
	            a = value.clone();
	            console.warn('Computing SVD on a matrix with more columns than rows. Consider enabling autoTranspose');
	        } else {
	            a = value.transpose();
	            m = a.rows;
	            n = a.columns;
	            swapped = true;
	            var aux = wantu;
	            wantu = wantv;
	            wantv = aux;
	        }
	    } else {
	        a = value.clone();
	    }

	    var s = new Array(Math.min(m + 1, n)),
	        U = getFilled2DArray(m, nu, 0),
	        V = getFilled2DArray(n, n, 0),
	        e = new Array(n),
	        work = new Array(m);

	    var nct = Math.min(m - 1, n);
	    var nrt = Math.max(0, Math.min(n - 2, m));

	    var i, j, k, p, t, ks, f, cs, sn, max, kase,
	        scale, sp, spm1, epm1, sk, ek, b, c, shift, g;

	    for (k = 0, max = Math.max(nct, nrt); k < max; k++) {
	        if (k < nct) {
	            s[k] = 0;
	            for (i = k; i < m; i++) {
	                s[k] = hypotenuse(s[k], a[i][k]);
	            }
	            if (s[k] !== 0) {
	                if (a[k][k] < 0) {
	                    s[k] = -s[k];
	                }
	                for (i = k; i < m; i++) {
	                    a[i][k] /= s[k];
	                }
	                a[k][k] += 1;
	            }
	            s[k] = -s[k];
	        }

	        for (j = k + 1; j < n; j++) {
	            if ((k < nct) && (s[k] !== 0)) {
	                t = 0;
	                for (i = k; i < m; i++) {
	                    t += a[i][k] * a[i][j];
	                }
	                t = -t / a[k][k];
	                for (i = k; i < m; i++) {
	                    a[i][j] += t * a[i][k];
	                }
	            }
	            e[j] = a[k][j];
	        }

	        if (wantu && (k < nct)) {
	            for (i = k; i < m; i++) {
	                U[i][k] = a[i][k];
	            }
	        }

	        if (k < nrt) {
	            e[k] = 0;
	            for (i = k + 1; i < n; i++) {
	                e[k] = hypotenuse(e[k], e[i]);
	            }
	            if (e[k] !== 0) {
	                if (e[k + 1] < 0)
	                    e[k] = -e[k];
	                for (i = k + 1; i < n; i++) {
	                    e[i] /= e[k];
	                }
	                e[k + 1] += 1;
	            }
	            e[k] = -e[k];
	            if ((k + 1 < m) && (e[k] !== 0)) {
	                for (i = k + 1; i < m; i++) {
	                    work[i] = 0;
	                }
	                for (j = k + 1; j < n; j++) {
	                    for (i = k + 1; i < m; i++) {
	                        work[i] += e[j] * a[i][j];
	                    }
	                }
	                for (j = k + 1; j < n; j++) {
	                    t = -e[j] / e[k + 1];
	                    for (i = k + 1; i < m; i++) {
	                        a[i][j] += t * work[i];
	                    }
	                }
	            }
	            if (wantv) {
	                for (i = k + 1; i < n; i++) {
	                    V[i][k] = e[i];
	                }
	            }
	        }
	    }

	    p = Math.min(n, m + 1);
	    if (nct < n) {
	        s[nct] = a[nct][nct];
	    }
	    if (m < p) {
	        s[p - 1] = 0;
	    }
	    if (nrt + 1 < p) {
	        e[nrt] = a[nrt][p - 1];
	    }
	    e[p - 1] = 0;

	    if (wantu) {
	        for (j = nct; j < nu; j++) {
	            for (i = 0; i < m; i++) {
	                U[i][j] = 0;
	            }
	            U[j][j] = 1;
	        }
	        for (k = nct - 1; k >= 0; k--) {
	            if (s[k] !== 0) {
	                for (j = k + 1; j < nu; j++) {
	                    t = 0;
	                    for (i = k; i < m; i++) {
	                        t += U[i][k] * U[i][j];
	                    }
	                    t = -t / U[k][k];
	                    for (i = k; i < m; i++) {
	                        U[i][j] += t * U[i][k];
	                    }
	                }
	                for (i = k; i < m; i++) {
	                    U[i][k] = -U[i][k];
	                }
	                U[k][k] = 1 + U[k][k];
	                for (i = 0; i < k - 1; i++) {
	                    U[i][k] = 0;
	                }
	            } else {
	                for (i = 0; i < m; i++) {
	                    U[i][k] = 0;
	                }
	                U[k][k] = 1;
	            }
	        }
	    }

	    if (wantv) {
	        for (k = n - 1; k >= 0; k--) {
	            if ((k < nrt) && (e[k] !== 0)) {
	                for (j = k + 1; j < n; j++) {
	                    t = 0;
	                    for (i = k + 1; i < n; i++) {
	                        t += V[i][k] * V[i][j];
	                    }
	                    t = -t / V[k + 1][k];
	                    for (i = k + 1; i < n; i++) {
	                        V[i][j] += t * V[i][k];
	                    }
	                }
	            }
	            for (i = 0; i < n; i++) {
	                V[i][k] = 0;
	            }
	            V[k][k] = 1;
	        }
	    }

	    var pp = p - 1,
	        iter = 0,
	        eps = Math.pow(2, -52);
	    while (p > 0) {
	        for (k = p - 2; k >= -1; k--) {
	            if (k === -1) {
	                break;
	            }
	            if (Math.abs(e[k]) <= eps * (Math.abs(s[k]) + Math.abs(s[k + 1]))) {
	                e[k] = 0;
	                break;
	            }
	        }
	        if (k === p - 2) {
	            kase = 4;
	        } else {
	            for (ks = p - 1; ks >= k; ks--) {
	                if (ks === k) {
	                    break;
	                }
	                t = (ks !== p ? Math.abs(e[ks]) : 0) + (ks !== k + 1 ? Math.abs(e[ks - 1]) : 0);
	                if (Math.abs(s[ks]) <= eps * t) {
	                    s[ks] = 0;
	                    break;
	                }
	            }
	            if (ks === k) {
	                kase = 3;
	            } else if (ks === p - 1) {
	                kase = 1;
	            } else {
	                kase = 2;
	                k = ks;
	            }
	        }

	        k++;

	        switch (kase) {
	            case 1: {
	                f = e[p - 2];
	                e[p - 2] = 0;
	                for (j = p - 2; j >= k; j--) {
	                    t = hypotenuse(s[j], f);
	                    cs = s[j] / t;
	                    sn = f / t;
	                    s[j] = t;
	                    if (j !== k) {
	                        f = -sn * e[j - 1];
	                        e[j - 1] = cs * e[j - 1];
	                    }
	                    if (wantv) {
	                        for (i = 0; i < n; i++) {
	                            t = cs * V[i][j] + sn * V[i][p - 1];
	                            V[i][p - 1] = -sn * V[i][j] + cs * V[i][p - 1];
	                            V[i][j] = t;
	                        }
	                    }
	                }
	                break;
	            }
	            case 2 : {
	                f = e[k - 1];
	                e[k - 1] = 0;
	                for (j = k; j < p; j++) {
	                    t = hypotenuse(s[j], f);
	                    cs = s[j] / t;
	                    sn = f / t;
	                    s[j] = t;
	                    f = -sn * e[j];
	                    e[j] = cs * e[j];
	                    if (wantu) {
	                        for (i = 0; i < m; i++) {
	                            t = cs * U[i][j] + sn * U[i][k - 1];
	                            U[i][k - 1] = -sn * U[i][j] + cs * U[i][k - 1];
	                            U[i][j] = t;
	                        }
	                    }
	                }
	                break;
	            }
	            case 3 : {
	                scale = Math.max(Math.max(Math.max(Math.max(Math.abs(s[p - 1]), Math.abs(s[p - 2])), Math.abs(e[p - 2])), Math.abs(s[k])), Math.abs(e[k]));
	                sp = s[p - 1] / scale;
	                spm1 = s[p - 2] / scale;
	                epm1 = e[p - 2] / scale;
	                sk = s[k] / scale;
	                ek = e[k] / scale;
	                b = ((spm1 + sp) * (spm1 - sp) + epm1 * epm1) / 2;
	                c = (sp * epm1) * (sp * epm1);
	                shift = 0;
	                if ((b !== 0) || (c !== 0)) {
	                    shift = Math.sqrt(b * b + c);
	                    if (b < 0) {
	                        shift = -shift;
	                    }
	                    shift = c / (b + shift);
	                }
	                f = (sk + sp) * (sk - sp) + shift;
	                g = sk * ek;
	                for (j = k; j < p - 1; j++) {
	                    t = hypotenuse(f, g);
	                    cs = f / t;
	                    sn = g / t;
	                    if (j !== k) {
	                        e[j - 1] = t;
	                    }
	                    f = cs * s[j] + sn * e[j];
	                    e[j] = cs * e[j] - sn * s[j];
	                    g = sn * s[j + 1];
	                    s[j + 1] = cs * s[j + 1];
	                    if (wantv) {
	                        for (i = 0; i < n; i++) {
	                            t = cs * V[i][j] + sn * V[i][j + 1];
	                            V[i][j + 1] = -sn * V[i][j] + cs * V[i][j + 1];
	                            V[i][j] = t;
	                        }
	                    }
	                    t = hypotenuse(f, g);
	                    cs = f / t;
	                    sn = g / t;
	                    s[j] = t;
	                    f = cs * e[j] + sn * s[j + 1];
	                    s[j + 1] = -sn * e[j] + cs * s[j + 1];
	                    g = sn * e[j + 1];
	                    e[j + 1] = cs * e[j + 1];
	                    if (wantu && (j < m - 1)) {
	                        for (i = 0; i < m; i++) {
	                            t = cs * U[i][j] + sn * U[i][j + 1];
	                            U[i][j + 1] = -sn * U[i][j] + cs * U[i][j + 1];
	                            U[i][j] = t;
	                        }
	                    }
	                }
	                e[p - 2] = f;
	                iter = iter + 1;
	                break;
	            }
	            case 4: {
	                if (s[k] <= 0) {
	                    s[k] = (s[k] < 0 ? -s[k] : 0);
	                    if (wantv) {
	                        for (i = 0; i <= pp; i++) {
	                            V[i][k] = -V[i][k];
	                        }
	                    }
	                }
	                while (k < pp) {
	                    if (s[k] >= s[k + 1]) {
	                        break;
	                    }
	                    t = s[k];
	                    s[k] = s[k + 1];
	                    s[k + 1] = t;
	                    if (wantv && (k < n - 1)) {
	                        for (i = 0; i < n; i++) {
	                            t = V[i][k + 1];
	                            V[i][k + 1] = V[i][k];
	                            V[i][k] = t;
	                        }
	                    }
	                    if (wantu && (k < m - 1)) {
	                        for (i = 0; i < m; i++) {
	                            t = U[i][k + 1];
	                            U[i][k + 1] = U[i][k];
	                            U[i][k] = t;
	                        }
	                    }
	                    k++;
	                }
	                iter = 0;
	                p--;
	                break;
	            }
	        }
	    }

	    if (swapped) {
	        var tmp = V;
	        V = U;
	        U = tmp;
	    }

	    this.m = m;
	    this.n = n;
	    this.s = s;
	    this.U = U;
	    this.V = V;
	}

	SingularValueDecomposition.prototype = {
	    get condition() {
	        return this.s[0] / this.s[Math.min(this.m, this.n) - 1];
	    },
	    get norm2() {
	        return this.s[0];
	    },
	    get rank() {
	        var eps = Math.pow(2, -52),
	            tol = Math.max(this.m, this.n) * this.s[0] * eps,
	            r = 0,
	            s = this.s;
	        for (var i = 0, ii = s.length; i < ii; i++) {
	            if (s[i] > tol) {
	                r++;
	            }
	        }
	        return r;
	    },
	    get diagonal() {
	        return this.s;
	    },
	    // https://github.com/accord-net/framework/blob/development/Sources/Accord.Math/Decompositions/SingularValueDecomposition.cs
	    get threshold() {
	        return (Math.pow(2, -52) / 2) * Math.max(this.m, this.n) * this.s[0];
	    },
	    get leftSingularVectors() {
	        if (!Matrix.isMatrix(this.U)) {
	            this.U = new Matrix(this.U);
	        }
	        return this.U;
	    },
	    get rightSingularVectors() {
	        if (!Matrix.isMatrix(this.V)) {
	            this.V = new Matrix(this.V);
	        }
	        return this.V;
	    },
	    get diagonalMatrix() {
	        return Matrix.diag(this.s);
	    },
	    solve: function (value) {

	        var Y = value,
	            e = this.threshold,
	            scols = this.s.length,
	            Ls = Matrix.zeros(scols, scols),
	            i;

	        for (i = 0; i < scols; i++) {
	            if (Math.abs(this.s[i]) <= e) {
	                Ls[i][i] = 0;
	            } else {
	                Ls[i][i] = 1 / this.s[i];
	            }
	        }

	        var U = this.U;
	        var V = this.rightSingularVectors;

	        var VL = V.mmul(Ls),
	            vrows = V.rows,
	            urows = U.length,
	            VLU = Matrix.zeros(vrows, urows),
	            j, k, sum;

	        for (i = 0; i < vrows; i++) {
	            for (j = 0; j < urows; j++) {
	                sum = 0;
	                for (k = 0; k < scols; k++) {
	                    sum += VL[i][k] * U[j][k];
	                }
	                VLU[i][j] = sum;
	            }
	        }

	        return VLU.mmul(Y);
	    },
	    solveForDiagonal: function (value) {
	        return this.solve(Matrix.diag(value));
	    },
	    inverse: function () {
	        var V = this.V;
	        var e = this.threshold,
	            vrows = V.length,
	            vcols = V[0].length,
	            X = new Matrix(vrows, this.s.length),
	            i, j;

	        for (i = 0; i < vrows; i++) {
	            for (j = 0; j < vcols; j++) {
	                if (Math.abs(this.s[j]) > e) {
	                    X[i][j] = V[i][j] / this.s[j];
	                } else {
	                    X[i][j] = 0;
	                }
	            }
	        }

	        var U = this.U;

	        var urows = U.length,
	            ucols = U[0].length,
	            Y = new Matrix(vrows, urows),
	            k, sum;

	        for (i = 0; i < vrows; i++) {
	            for (j = 0; j < urows; j++) {
	                sum = 0;
	                for (k = 0; k < ucols; k++) {
	                    sum += X[i][k] * U[j][k];
	                }
	                Y[i][j] = sum;
	            }
	        }

	        return Y;
	    }
	};

	module.exports = SingularValueDecomposition;


/***/ },
/* 25 */
/***/ function(module, exports) {

	'use strict';

	exports.hypotenuse = function hypotenuse(a, b) {
	    if (Math.abs(a) > Math.abs(b)) {
	        var r = b / a;
	        return Math.abs(a) * Math.sqrt(1 + r * r);
	    }
	    if (b !== 0) {
	        var r = a / b;
	        return Math.abs(b) * Math.sqrt(1 + r * r);
	    }
	    return 0;
	};

	// For use in the decomposition algorithms. With big matrices, access time is
	// too long on elements from array subclass
	// todo check when it is fixed in v8
	// http://jsperf.com/access-and-write-array-subclass
	exports.getEmpty2DArray = function (rows, columns) {
	    var array = new Array(rows);
	    for (var i = 0; i < rows; i++) {
	        array[i] = new Array(columns);
	    }
	    return array;
	};

	exports.getFilled2DArray = function (rows, columns, value) {
	    var array = new Array(rows);
	    for (var i = 0; i < rows; i++) {
	        array[i] = new Array(columns);
	        for (var j = 0; j < columns; j++) {
	            array[i][j] = value;
	        }
	    }
	    return array;
	};


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const Matrix = __webpack_require__(3);
	const util = __webpack_require__(25);
	const hypotenuse = util.hypotenuse;
	const getFilled2DArray = util.getFilled2DArray;

	const defaultOptions = {
	    assumeSymmetric: false
	};

	// https://github.com/lutzroeder/Mapack/blob/master/Source/EigenvalueDecomposition.cs
	function EigenvalueDecomposition(matrix, options) {
	    options = Object.assign({}, defaultOptions, options);
	    if (!(this instanceof EigenvalueDecomposition)) {
	        return new EigenvalueDecomposition(matrix, options);
	    }
	    matrix = Matrix.checkMatrix(matrix);
	    if (!matrix.isSquare()) {
	        throw new Error('Matrix is not a square matrix');
	    }

	    var n = matrix.columns,
	        V = getFilled2DArray(n, n, 0),
	        d = new Array(n),
	        e = new Array(n),
	        value = matrix,
	        i, j;

	    var isSymmetric = false;
	    if (options.assumeSymmetric) {
	        isSymmetric = true;
	    } else {
	        isSymmetric = matrix.isSymmetric();
	    }

	    if (isSymmetric) {
	        for (i = 0; i < n; i++) {
	            for (j = 0; j < n; j++) {
	                V[i][j] = value.get(i, j);
	            }
	        }
	        tred2(n, e, d, V);
	        tql2(n, e, d, V);
	    }
	    else {
	        var H = getFilled2DArray(n, n, 0),
	            ort = new Array(n);
	        for (j = 0; j < n; j++) {
	            for (i = 0; i < n; i++) {
	                H[i][j] = value.get(i, j);
	            }
	        }
	        orthes(n, H, ort, V);
	        hqr2(n, e, d, V, H);
	    }

	    this.n = n;
	    this.e = e;
	    this.d = d;
	    this.V = V;
	}

	EigenvalueDecomposition.prototype = {
	    get realEigenvalues() {
	        return this.d;
	    },
	    get imaginaryEigenvalues() {
	        return this.e;
	    },
	    get eigenvectorMatrix() {
	        if (!Matrix.isMatrix(this.V)) {
	            this.V = new Matrix(this.V);
	        }
	        return this.V;
	    },
	    get diagonalMatrix() {
	        var n = this.n,
	            e = this.e,
	            d = this.d,
	            X = new Matrix(n, n),
	            i, j;
	        for (i = 0; i < n; i++) {
	            for (j = 0; j < n; j++) {
	                X[i][j] = 0;
	            }
	            X[i][i] = d[i];
	            if (e[i] > 0) {
	                X[i][i + 1] = e[i];
	            }
	            else if (e[i] < 0) {
	                X[i][i - 1] = e[i];
	            }
	        }
	        return X;
	    }
	};

	function tred2(n, e, d, V) {

	    var f, g, h, i, j, k,
	        hh, scale;

	    for (j = 0; j < n; j++) {
	        d[j] = V[n - 1][j];
	    }

	    for (i = n - 1; i > 0; i--) {
	        scale = 0;
	        h = 0;
	        for (k = 0; k < i; k++) {
	            scale = scale + Math.abs(d[k]);
	        }

	        if (scale === 0) {
	            e[i] = d[i - 1];
	            for (j = 0; j < i; j++) {
	                d[j] = V[i - 1][j];
	                V[i][j] = 0;
	                V[j][i] = 0;
	            }
	        } else {
	            for (k = 0; k < i; k++) {
	                d[k] /= scale;
	                h += d[k] * d[k];
	            }

	            f = d[i - 1];
	            g = Math.sqrt(h);
	            if (f > 0) {
	                g = -g;
	            }

	            e[i] = scale * g;
	            h = h - f * g;
	            d[i - 1] = f - g;
	            for (j = 0; j < i; j++) {
	                e[j] = 0;
	            }

	            for (j = 0; j < i; j++) {
	                f = d[j];
	                V[j][i] = f;
	                g = e[j] + V[j][j] * f;
	                for (k = j + 1; k <= i - 1; k++) {
	                    g += V[k][j] * d[k];
	                    e[k] += V[k][j] * f;
	                }
	                e[j] = g;
	            }

	            f = 0;
	            for (j = 0; j < i; j++) {
	                e[j] /= h;
	                f += e[j] * d[j];
	            }

	            hh = f / (h + h);
	            for (j = 0; j < i; j++) {
	                e[j] -= hh * d[j];
	            }

	            for (j = 0; j < i; j++) {
	                f = d[j];
	                g = e[j];
	                for (k = j; k <= i - 1; k++) {
	                    V[k][j] -= (f * e[k] + g * d[k]);
	                }
	                d[j] = V[i - 1][j];
	                V[i][j] = 0;
	            }
	        }
	        d[i] = h;
	    }

	    for (i = 0; i < n - 1; i++) {
	        V[n - 1][i] = V[i][i];
	        V[i][i] = 1;
	        h = d[i + 1];
	        if (h !== 0) {
	            for (k = 0; k <= i; k++) {
	                d[k] = V[k][i + 1] / h;
	            }

	            for (j = 0; j <= i; j++) {
	                g = 0;
	                for (k = 0; k <= i; k++) {
	                    g += V[k][i + 1] * V[k][j];
	                }
	                for (k = 0; k <= i; k++) {
	                    V[k][j] -= g * d[k];
	                }
	            }
	        }

	        for (k = 0; k <= i; k++) {
	            V[k][i + 1] = 0;
	        }
	    }

	    for (j = 0; j < n; j++) {
	        d[j] = V[n - 1][j];
	        V[n - 1][j] = 0;
	    }

	    V[n - 1][n - 1] = 1;
	    e[0] = 0;
	}

	function tql2(n, e, d, V) {

	    var g, h, i, j, k, l, m, p, r,
	        dl1, c, c2, c3, el1, s, s2,
	        iter;

	    for (i = 1; i < n; i++) {
	        e[i - 1] = e[i];
	    }

	    e[n - 1] = 0;

	    var f = 0,
	        tst1 = 0,
	        eps = Math.pow(2, -52);

	    for (l = 0; l < n; l++) {
	        tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
	        m = l;
	        while (m < n) {
	            if (Math.abs(e[m]) <= eps * tst1) {
	                break;
	            }
	            m++;
	        }

	        if (m > l) {
	            iter = 0;
	            do {
	                iter = iter + 1;

	                g = d[l];
	                p = (d[l + 1] - g) / (2 * e[l]);
	                r = hypotenuse(p, 1);
	                if (p < 0) {
	                    r = -r;
	                }

	                d[l] = e[l] / (p + r);
	                d[l + 1] = e[l] * (p + r);
	                dl1 = d[l + 1];
	                h = g - d[l];
	                for (i = l + 2; i < n; i++) {
	                    d[i] -= h;
	                }

	                f = f + h;

	                p = d[m];
	                c = 1;
	                c2 = c;
	                c3 = c;
	                el1 = e[l + 1];
	                s = 0;
	                s2 = 0;
	                for (i = m - 1; i >= l; i--) {
	                    c3 = c2;
	                    c2 = c;
	                    s2 = s;
	                    g = c * e[i];
	                    h = c * p;
	                    r = hypotenuse(p, e[i]);
	                    e[i + 1] = s * r;
	                    s = e[i] / r;
	                    c = p / r;
	                    p = c * d[i] - s * g;
	                    d[i + 1] = h + s * (c * g + s * d[i]);

	                    for (k = 0; k < n; k++) {
	                        h = V[k][i + 1];
	                        V[k][i + 1] = s * V[k][i] + c * h;
	                        V[k][i] = c * V[k][i] - s * h;
	                    }
	                }

	                p = -s * s2 * c3 * el1 * e[l] / dl1;
	                e[l] = s * p;
	                d[l] = c * p;

	            }
	            while (Math.abs(e[l]) > eps * tst1);
	        }
	        d[l] = d[l] + f;
	        e[l] = 0;
	    }

	    for (i = 0; i < n - 1; i++) {
	        k = i;
	        p = d[i];
	        for (j = i + 1; j < n; j++) {
	            if (d[j] < p) {
	                k = j;
	                p = d[j];
	            }
	        }

	        if (k !== i) {
	            d[k] = d[i];
	            d[i] = p;
	            for (j = 0; j < n; j++) {
	                p = V[j][i];
	                V[j][i] = V[j][k];
	                V[j][k] = p;
	            }
	        }
	    }
	}

	function orthes(n, H, ort, V) {

	    var low = 0,
	        high = n - 1,
	        f, g, h, i, j, m,
	        scale;

	    for (m = low + 1; m <= high - 1; m++) {
	        scale = 0;
	        for (i = m; i <= high; i++) {
	            scale = scale + Math.abs(H[i][m - 1]);
	        }

	        if (scale !== 0) {
	            h = 0;
	            for (i = high; i >= m; i--) {
	                ort[i] = H[i][m - 1] / scale;
	                h += ort[i] * ort[i];
	            }

	            g = Math.sqrt(h);
	            if (ort[m] > 0) {
	                g = -g;
	            }

	            h = h - ort[m] * g;
	            ort[m] = ort[m] - g;

	            for (j = m; j < n; j++) {
	                f = 0;
	                for (i = high; i >= m; i--) {
	                    f += ort[i] * H[i][j];
	                }

	                f = f / h;
	                for (i = m; i <= high; i++) {
	                    H[i][j] -= f * ort[i];
	                }
	            }

	            for (i = 0; i <= high; i++) {
	                f = 0;
	                for (j = high; j >= m; j--) {
	                    f += ort[j] * H[i][j];
	                }

	                f = f / h;
	                for (j = m; j <= high; j++) {
	                    H[i][j] -= f * ort[j];
	                }
	            }

	            ort[m] = scale * ort[m];
	            H[m][m - 1] = scale * g;
	        }
	    }

	    for (i = 0; i < n; i++) {
	        for (j = 0; j < n; j++) {
	            V[i][j] = (i === j ? 1 : 0);
	        }
	    }

	    for (m = high - 1; m >= low + 1; m--) {
	        if (H[m][m - 1] !== 0) {
	            for (i = m + 1; i <= high; i++) {
	                ort[i] = H[i][m - 1];
	            }

	            for (j = m; j <= high; j++) {
	                g = 0;
	                for (i = m; i <= high; i++) {
	                    g += ort[i] * V[i][j];
	                }

	                g = (g / ort[m]) / H[m][m - 1];
	                for (i = m; i <= high; i++) {
	                    V[i][j] += g * ort[i];
	                }
	            }
	        }
	    }
	}

	function hqr2(nn, e, d, V, H) {
	    var n = nn - 1,
	        low = 0,
	        high = nn - 1,
	        eps = Math.pow(2, -52),
	        exshift = 0,
	        norm = 0,
	        p = 0,
	        q = 0,
	        r = 0,
	        s = 0,
	        z = 0,
	        iter = 0,
	        i, j, k, l, m, t, w, x, y,
	        ra, sa, vr, vi,
	        notlast, cdivres;

	    for (i = 0; i < nn; i++) {
	        if (i < low || i > high) {
	            d[i] = H[i][i];
	            e[i] = 0;
	        }

	        for (j = Math.max(i - 1, 0); j < nn; j++) {
	            norm = norm + Math.abs(H[i][j]);
	        }
	    }

	    while (n >= low) {
	        l = n;
	        while (l > low) {
	            s = Math.abs(H[l - 1][l - 1]) + Math.abs(H[l][l]);
	            if (s === 0) {
	                s = norm;
	            }
	            if (Math.abs(H[l][l - 1]) < eps * s) {
	                break;
	            }
	            l--;
	        }

	        if (l === n) {
	            H[n][n] = H[n][n] + exshift;
	            d[n] = H[n][n];
	            e[n] = 0;
	            n--;
	            iter = 0;
	        } else if (l === n - 1) {
	            w = H[n][n - 1] * H[n - 1][n];
	            p = (H[n - 1][n - 1] - H[n][n]) / 2;
	            q = p * p + w;
	            z = Math.sqrt(Math.abs(q));
	            H[n][n] = H[n][n] + exshift;
	            H[n - 1][n - 1] = H[n - 1][n - 1] + exshift;
	            x = H[n][n];

	            if (q >= 0) {
	                z = (p >= 0) ? (p + z) : (p - z);
	                d[n - 1] = x + z;
	                d[n] = d[n - 1];
	                if (z !== 0) {
	                    d[n] = x - w / z;
	                }
	                e[n - 1] = 0;
	                e[n] = 0;
	                x = H[n][n - 1];
	                s = Math.abs(x) + Math.abs(z);
	                p = x / s;
	                q = z / s;
	                r = Math.sqrt(p * p + q * q);
	                p = p / r;
	                q = q / r;

	                for (j = n - 1; j < nn; j++) {
	                    z = H[n - 1][j];
	                    H[n - 1][j] = q * z + p * H[n][j];
	                    H[n][j] = q * H[n][j] - p * z;
	                }

	                for (i = 0; i <= n; i++) {
	                    z = H[i][n - 1];
	                    H[i][n - 1] = q * z + p * H[i][n];
	                    H[i][n] = q * H[i][n] - p * z;
	                }

	                for (i = low; i <= high; i++) {
	                    z = V[i][n - 1];
	                    V[i][n - 1] = q * z + p * V[i][n];
	                    V[i][n] = q * V[i][n] - p * z;
	                }
	            } else {
	                d[n - 1] = x + p;
	                d[n] = x + p;
	                e[n - 1] = z;
	                e[n] = -z;
	            }

	            n = n - 2;
	            iter = 0;
	        } else {
	            x = H[n][n];
	            y = 0;
	            w = 0;
	            if (l < n) {
	                y = H[n - 1][n - 1];
	                w = H[n][n - 1] * H[n - 1][n];
	            }

	            if (iter === 10) {
	                exshift += x;
	                for (i = low; i <= n; i++) {
	                    H[i][i] -= x;
	                }
	                s = Math.abs(H[n][n - 1]) + Math.abs(H[n - 1][n - 2]);
	                x = y = 0.75 * s;
	                w = -0.4375 * s * s;
	            }

	            if (iter === 30) {
	                s = (y - x) / 2;
	                s = s * s + w;
	                if (s > 0) {
	                    s = Math.sqrt(s);
	                    if (y < x) {
	                        s = -s;
	                    }
	                    s = x - w / ((y - x) / 2 + s);
	                    for (i = low; i <= n; i++) {
	                        H[i][i] -= s;
	                    }
	                    exshift += s;
	                    x = y = w = 0.964;
	                }
	            }

	            iter = iter + 1;

	            m = n - 2;
	            while (m >= l) {
	                z = H[m][m];
	                r = x - z;
	                s = y - z;
	                p = (r * s - w) / H[m + 1][m] + H[m][m + 1];
	                q = H[m + 1][m + 1] - z - r - s;
	                r = H[m + 2][m + 1];
	                s = Math.abs(p) + Math.abs(q) + Math.abs(r);
	                p = p / s;
	                q = q / s;
	                r = r / s;
	                if (m === l) {
	                    break;
	                }
	                if (Math.abs(H[m][m - 1]) * (Math.abs(q) + Math.abs(r)) < eps * (Math.abs(p) * (Math.abs(H[m - 1][m - 1]) + Math.abs(z) + Math.abs(H[m + 1][m + 1])))) {
	                    break;
	                }
	                m--;
	            }

	            for (i = m + 2; i <= n; i++) {
	                H[i][i - 2] = 0;
	                if (i > m + 2) {
	                    H[i][i - 3] = 0;
	                }
	            }

	            for (k = m; k <= n - 1; k++) {
	                notlast = (k !== n - 1);
	                if (k !== m) {
	                    p = H[k][k - 1];
	                    q = H[k + 1][k - 1];
	                    r = (notlast ? H[k + 2][k - 1] : 0);
	                    x = Math.abs(p) + Math.abs(q) + Math.abs(r);
	                    if (x !== 0) {
	                        p = p / x;
	                        q = q / x;
	                        r = r / x;
	                    }
	                }

	                if (x === 0) {
	                    break;
	                }

	                s = Math.sqrt(p * p + q * q + r * r);
	                if (p < 0) {
	                    s = -s;
	                }

	                if (s !== 0) {
	                    if (k !== m) {
	                        H[k][k - 1] = -s * x;
	                    } else if (l !== m) {
	                        H[k][k - 1] = -H[k][k - 1];
	                    }

	                    p = p + s;
	                    x = p / s;
	                    y = q / s;
	                    z = r / s;
	                    q = q / p;
	                    r = r / p;

	                    for (j = k; j < nn; j++) {
	                        p = H[k][j] + q * H[k + 1][j];
	                        if (notlast) {
	                            p = p + r * H[k + 2][j];
	                            H[k + 2][j] = H[k + 2][j] - p * z;
	                        }

	                        H[k][j] = H[k][j] - p * x;
	                        H[k + 1][j] = H[k + 1][j] - p * y;
	                    }

	                    for (i = 0; i <= Math.min(n, k + 3); i++) {
	                        p = x * H[i][k] + y * H[i][k + 1];
	                        if (notlast) {
	                            p = p + z * H[i][k + 2];
	                            H[i][k + 2] = H[i][k + 2] - p * r;
	                        }

	                        H[i][k] = H[i][k] - p;
	                        H[i][k + 1] = H[i][k + 1] - p * q;
	                    }

	                    for (i = low; i <= high; i++) {
	                        p = x * V[i][k] + y * V[i][k + 1];
	                        if (notlast) {
	                            p = p + z * V[i][k + 2];
	                            V[i][k + 2] = V[i][k + 2] - p * r;
	                        }

	                        V[i][k] = V[i][k] - p;
	                        V[i][k + 1] = V[i][k + 1] - p * q;
	                    }
	                }
	            }
	        }
	    }

	    if (norm === 0) {
	        return;
	    }

	    for (n = nn - 1; n >= 0; n--) {
	        p = d[n];
	        q = e[n];

	        if (q === 0) {
	            l = n;
	            H[n][n] = 1;
	            for (i = n - 1; i >= 0; i--) {
	                w = H[i][i] - p;
	                r = 0;
	                for (j = l; j <= n; j++) {
	                    r = r + H[i][j] * H[j][n];
	                }

	                if (e[i] < 0) {
	                    z = w;
	                    s = r;
	                } else {
	                    l = i;
	                    if (e[i] === 0) {
	                        H[i][n] = (w !== 0) ? (-r / w) : (-r / (eps * norm));
	                    } else {
	                        x = H[i][i + 1];
	                        y = H[i + 1][i];
	                        q = (d[i] - p) * (d[i] - p) + e[i] * e[i];
	                        t = (x * s - z * r) / q;
	                        H[i][n] = t;
	                        H[i + 1][n] = (Math.abs(x) > Math.abs(z)) ? ((-r - w * t) / x) : ((-s - y * t) / z);
	                    }

	                    t = Math.abs(H[i][n]);
	                    if ((eps * t) * t > 1) {
	                        for (j = i; j <= n; j++) {
	                            H[j][n] = H[j][n] / t;
	                        }
	                    }
	                }
	            }
	        } else if (q < 0) {
	            l = n - 1;

	            if (Math.abs(H[n][n - 1]) > Math.abs(H[n - 1][n])) {
	                H[n - 1][n - 1] = q / H[n][n - 1];
	                H[n - 1][n] = -(H[n][n] - p) / H[n][n - 1];
	            } else {
	                cdivres = cdiv(0, -H[n - 1][n], H[n - 1][n - 1] - p, q);
	                H[n - 1][n - 1] = cdivres[0];
	                H[n - 1][n] = cdivres[1];
	            }

	            H[n][n - 1] = 0;
	            H[n][n] = 1;
	            for (i = n - 2; i >= 0; i--) {
	                ra = 0;
	                sa = 0;
	                for (j = l; j <= n; j++) {
	                    ra = ra + H[i][j] * H[j][n - 1];
	                    sa = sa + H[i][j] * H[j][n];
	                }

	                w = H[i][i] - p;

	                if (e[i] < 0) {
	                    z = w;
	                    r = ra;
	                    s = sa;
	                } else {
	                    l = i;
	                    if (e[i] === 0) {
	                        cdivres = cdiv(-ra, -sa, w, q);
	                        H[i][n - 1] = cdivres[0];
	                        H[i][n] = cdivres[1];
	                    } else {
	                        x = H[i][i + 1];
	                        y = H[i + 1][i];
	                        vr = (d[i] - p) * (d[i] - p) + e[i] * e[i] - q * q;
	                        vi = (d[i] - p) * 2 * q;
	                        if (vr === 0 && vi === 0) {
	                            vr = eps * norm * (Math.abs(w) + Math.abs(q) + Math.abs(x) + Math.abs(y) + Math.abs(z));
	                        }
	                        cdivres = cdiv(x * r - z * ra + q * sa, x * s - z * sa - q * ra, vr, vi);
	                        H[i][n - 1] = cdivres[0];
	                        H[i][n] = cdivres[1];
	                        if (Math.abs(x) > (Math.abs(z) + Math.abs(q))) {
	                            H[i + 1][n - 1] = (-ra - w * H[i][n - 1] + q * H[i][n]) / x;
	                            H[i + 1][n] = (-sa - w * H[i][n] - q * H[i][n - 1]) / x;
	                        } else {
	                            cdivres = cdiv(-r - y * H[i][n - 1], -s - y * H[i][n], z, q);
	                            H[i + 1][n - 1] = cdivres[0];
	                            H[i + 1][n] = cdivres[1];
	                        }
	                    }

	                    t = Math.max(Math.abs(H[i][n - 1]), Math.abs(H[i][n]));
	                    if ((eps * t) * t > 1) {
	                        for (j = i; j <= n; j++) {
	                            H[j][n - 1] = H[j][n - 1] / t;
	                            H[j][n] = H[j][n] / t;
	                        }
	                    }
	                }
	            }
	        }
	    }

	    for (i = 0; i < nn; i++) {
	        if (i < low || i > high) {
	            for (j = i; j < nn; j++) {
	                V[i][j] = H[i][j];
	            }
	        }
	    }

	    for (j = nn - 1; j >= low; j--) {
	        for (i = low; i <= high; i++) {
	            z = 0;
	            for (k = low; k <= Math.min(j, high); k++) {
	                z = z + V[i][k] * H[k][j];
	            }
	            V[i][j] = z;
	        }
	    }
	}

	function cdiv(xr, xi, yr, yi) {
	    var r, d;
	    if (Math.abs(yr) > Math.abs(yi)) {
	        r = yi / yr;
	        d = yr + r * yi;
	        return [(xr + r * xi) / d, (xi - r * xr) / d];
	    }
	    else {
	        r = yr / yi;
	        d = yi + r * yr;
	        return [(r * xr + xi) / d, (r * xi - xr) / d];
	    }
	}

	module.exports = EigenvalueDecomposition;


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(3);

	// https://github.com/lutzroeder/Mapack/blob/master/Source/LuDecomposition.cs
	function LuDecomposition(matrix) {
	    if (!(this instanceof LuDecomposition)) {
	        return new LuDecomposition(matrix);
	    }
	    matrix = Matrix.checkMatrix(matrix);

	    var lu = matrix.clone(),
	        rows = lu.rows,
	        columns = lu.columns,
	        pivotVector = new Array(rows),
	        pivotSign = 1,
	        i, j, k, p, s, t, v,
	        LUrowi, LUcolj, kmax;

	    for (i = 0; i < rows; i++) {
	        pivotVector[i] = i;
	    }

	    LUcolj = new Array(rows);

	    for (j = 0; j < columns; j++) {

	        for (i = 0; i < rows; i++) {
	            LUcolj[i] = lu[i][j];
	        }

	        for (i = 0; i < rows; i++) {
	            LUrowi = lu[i];
	            kmax = Math.min(i, j);
	            s = 0;
	            for (k = 0; k < kmax; k++) {
	                s += LUrowi[k] * LUcolj[k];
	            }
	            LUrowi[j] = LUcolj[i] -= s;
	        }

	        p = j;
	        for (i = j + 1; i < rows; i++) {
	            if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
	                p = i;
	            }
	        }

	        if (p !== j) {
	            for (k = 0; k < columns; k++) {
	                t = lu[p][k];
	                lu[p][k] = lu[j][k];
	                lu[j][k] = t;
	            }

	            v = pivotVector[p];
	            pivotVector[p] = pivotVector[j];
	            pivotVector[j] = v;

	            pivotSign = -pivotSign;
	        }

	        if (j < rows && lu[j][j] !== 0) {
	            for (i = j + 1; i < rows; i++) {
	                lu[i][j] /= lu[j][j];
	            }
	        }
	    }

	    this.LU = lu;
	    this.pivotVector = pivotVector;
	    this.pivotSign = pivotSign;
	}

	LuDecomposition.prototype = {
	    isSingular: function () {
	        var data = this.LU,
	            col = data.columns;
	        for (var j = 0; j < col; j++) {
	            if (data[j][j] === 0) {
	                return true;
	            }
	        }
	        return false;
	    },
	    get determinant() {
	        var data = this.LU;
	        if (!data.isSquare())
	            throw new Error('Matrix must be square');
	        var determinant = this.pivotSign, col = data.columns;
	        for (var j = 0; j < col; j++)
	            determinant *= data[j][j];
	        return determinant;
	    },
	    get lowerTriangularMatrix() {
	        var data = this.LU,
	            rows = data.rows,
	            columns = data.columns,
	            X = new Matrix(rows, columns);
	        for (var i = 0; i < rows; i++) {
	            for (var j = 0; j < columns; j++) {
	                if (i > j) {
	                    X[i][j] = data[i][j];
	                } else if (i === j) {
	                    X[i][j] = 1;
	                } else {
	                    X[i][j] = 0;
	                }
	            }
	        }
	        return X;
	    },
	    get upperTriangularMatrix() {
	        var data = this.LU,
	            rows = data.rows,
	            columns = data.columns,
	            X = new Matrix(rows, columns);
	        for (var i = 0; i < rows; i++) {
	            for (var j = 0; j < columns; j++) {
	                if (i <= j) {
	                    X[i][j] = data[i][j];
	                } else {
	                    X[i][j] = 0;
	                }
	            }
	        }
	        return X;
	    },
	    get pivotPermutationVector() {
	        return this.pivotVector.slice();
	    },
	    solve: function (value) {
	        value = Matrix.checkMatrix(value);

	        var lu = this.LU,
	            rows = lu.rows;

	        if (rows !== value.rows)
	            throw new Error('Invalid matrix dimensions');
	        if (this.isSingular())
	            throw new Error('LU matrix is singular');

	        var count = value.columns,
	            X = value.subMatrixRow(this.pivotVector, 0, count - 1),
	            columns = lu.columns,
	            i, j, k;

	        for (k = 0; k < columns; k++) {
	            for (i = k + 1; i < columns; i++) {
	                for (j = 0; j < count; j++) {
	                    X[i][j] -= X[k][j] * lu[i][k];
	                }
	            }
	        }
	        for (k = columns - 1; k >= 0; k--) {
	            for (j = 0; j < count; j++) {
	                X[k][j] /= lu[k][k];
	            }
	            for (i = 0; i < k; i++) {
	                for (j = 0; j < count; j++) {
	                    X[i][j] -= X[k][j] * lu[i][k];
	                }
	            }
	        }
	        return X;
	    }
	};

	module.exports = LuDecomposition;


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(3);
	var hypotenuse = __webpack_require__(25).hypotenuse;

	//https://github.com/lutzroeder/Mapack/blob/master/Source/QrDecomposition.cs
	function QrDecomposition(value) {
	    if (!(this instanceof QrDecomposition)) {
	        return new QrDecomposition(value);
	    }
	    value = Matrix.checkMatrix(value);

	    var qr = value.clone(),
	        m = value.rows,
	        n = value.columns,
	        rdiag = new Array(n),
	        i, j, k, s;

	    for (k = 0; k < n; k++) {
	        var nrm = 0;
	        for (i = k; i < m; i++) {
	            nrm = hypotenuse(nrm, qr[i][k]);
	        }
	        if (nrm !== 0) {
	            if (qr[k][k] < 0) {
	                nrm = -nrm;
	            }
	            for (i = k; i < m; i++) {
	                qr[i][k] /= nrm;
	            }
	            qr[k][k] += 1;
	            for (j = k + 1; j < n; j++) {
	                s = 0;
	                for (i = k; i < m; i++) {
	                    s += qr[i][k] * qr[i][j];
	                }
	                s = -s / qr[k][k];
	                for (i = k; i < m; i++) {
	                    qr[i][j] += s * qr[i][k];
	                }
	            }
	        }
	        rdiag[k] = -nrm;
	    }

	    this.QR = qr;
	    this.Rdiag = rdiag;
	}

	QrDecomposition.prototype = {
	    solve: function (value) {
	        value = Matrix.checkMatrix(value);

	        var qr = this.QR,
	            m = qr.rows;

	        if (value.rows !== m)
	            throw new Error('Matrix row dimensions must agree');
	        if (!this.isFullRank())
	            throw new Error('Matrix is rank deficient');

	        var count = value.columns,
	            X = value.clone(),
	            n = qr.columns,
	            i, j, k, s;

	        for (k = 0; k < n; k++) {
	            for (j = 0; j < count; j++) {
	                s = 0;
	                for (i = k; i < m; i++) {
	                    s += qr[i][k] * X[i][j];
	                }
	                s = -s / qr[k][k];
	                for (i = k; i < m; i++) {
	                    X[i][j] += s * qr[i][k];
	                }
	            }
	        }
	        for (k = n - 1; k >= 0; k--) {
	            for (j = 0; j < count; j++) {
	                X[k][j] /= this.Rdiag[k];
	            }
	            for (i = 0; i < k; i++) {
	                for (j = 0; j < count; j++) {
	                    X[i][j] -= X[k][j] * qr[i][k];
	                }
	            }
	        }

	        return X.subMatrix(0, n - 1, 0, count - 1);
	    },
	    isFullRank: function () {
	        var columns = this.QR.columns;
	        for (var i = 0; i < columns; i++) {
	            if (this.Rdiag[i] === 0) {
	                return false;
	            }
	        }
	        return true;
	    },
	    get upperTriangularMatrix() {
	        var qr = this.QR,
	            n = qr.columns,
	            X = new Matrix(n, n),
	            i, j;
	        for (i = 0; i < n; i++) {
	            for (j = 0; j < n; j++) {
	                if (i < j) {
	                    X[i][j] = qr[i][j];
	                } else if (i === j) {
	                    X[i][j] = this.Rdiag[i];
	                } else {
	                    X[i][j] = 0;
	                }
	            }
	        }
	        return X;
	    },
	    get orthogonalMatrix() {
	        var qr = this.QR,
	            rows = qr.rows,
	            columns = qr.columns,
	            X = new Matrix(rows, columns),
	            i, j, k, s;

	        for (k = columns - 1; k >= 0; k--) {
	            for (i = 0; i < rows; i++) {
	                X[i][k] = 0;
	            }
	            X[k][k] = 1;
	            for (j = k; j < columns; j++) {
	                if (qr[k][k] !== 0) {
	                    s = 0;
	                    for (i = k; i < rows; i++) {
	                        s += qr[i][k] * X[i][j];
	                    }

	                    s = -s / qr[k][k];

	                    for (i = k; i < rows; i++) {
	                        X[i][j] += s * qr[i][k];
	                    }
	                }
	            }
	        }
	        return X;
	    }
	};

	module.exports = QrDecomposition;


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(3);

	// https://github.com/lutzroeder/Mapack/blob/master/Source/CholeskyDecomposition.cs
	function CholeskyDecomposition(value) {
	    if (!(this instanceof CholeskyDecomposition)) {
	        return new CholeskyDecomposition(value);
	    }
	    value = Matrix.checkMatrix(value);
	    if (!value.isSymmetric())
	        throw new Error('Matrix is not symmetric');

	    var a = value,
	        dimension = a.rows,
	        l = new Matrix(dimension, dimension),
	        positiveDefinite = true,
	        i, j, k;

	    for (j = 0; j < dimension; j++) {
	        var Lrowj = l[j];
	        var d = 0;
	        for (k = 0; k < j; k++) {
	            var Lrowk = l[k];
	            var s = 0;
	            for (i = 0; i < k; i++) {
	                s += Lrowk[i] * Lrowj[i];
	            }
	            Lrowj[k] = s = (a[j][k] - s) / l[k][k];
	            d = d + s * s;
	        }

	        d = a[j][j] - d;

	        positiveDefinite &= (d > 0);
	        l[j][j] = Math.sqrt(Math.max(d, 0));
	        for (k = j + 1; k < dimension; k++) {
	            l[j][k] = 0;
	        }
	    }

	    if (!positiveDefinite) {
	        throw new Error('Matrix is not positive definite');
	    }

	    this.L = l;
	}

	CholeskyDecomposition.prototype = {
	    get lowerTriangularMatrix() {
	        return this.L;
	    },
	    solve: function (value) {
	        value = Matrix.checkMatrix(value);

	        var l = this.L,
	            dimension = l.rows;

	        if (value.rows !== dimension) {
	            throw new Error('Matrix dimensions do not match');
	        }

	        var count = value.columns,
	            B = value.clone(),
	            i, j, k;

	        for (k = 0; k < dimension; k++) {
	            for (j = 0; j < count; j++) {
	                for (i = 0; i < k; i++) {
	                    B[k][j] -= B[i][j] * l[k][i];
	                }
	                B[k][j] /= l[k][k];
	            }
	        }

	        for (k = dimension - 1; k >= 0; k--) {
	            for (j = 0; j < count; j++) {
	                for (i = k + 1; i < dimension; i++) {
	                    B[k][j] -= B[i][j] * l[i][k];
	                }
	                B[k][j] /= l[k][k];
	            }
	        }

	        return B;
	    }
	};

	module.exports = CholeskyDecomposition;


/***/ },
/* 30 */
/***/ function(module, exports) {

	'use strict';

	exports.logarithmic = function (random, len) {
	    if (len === undefined) {
	        return Math.pow(random(), 10);
	    }
	    var arr = new Array(len);
	    for (var i = 0; i < arr.length; i++) {
	        arr[i] = Math.pow(random(), 10);
	    }
	    return arr;
	};

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Matrix = __webpack_require__(2);
	var stat = __webpack_require__(8).matrix;

	function newtonRaphton(model, beta, cTotal, c, solidModel, solidBeta, solidC) {
	    // c is component concentrations. The initialization is up to the caller
	    // model contains stoechiometric coefficient of the reactions
	    // beta is the equilibrium constant for each reaction
	    // cTotal is the total concentration of each component
	    // solid model contains stoechiometric coefficients of the precipitation reactions
	    // solidBeta contains the solubility constants
	    // solidC contains the initial solid species "concentrations"
	    var ncomp = cTotal.length;
	    var nspec = beta.length;

	    if (!solidModel) solidModel = new Array(ncomp).fill(0).map(function () {
	        return [];
	    });
	    if (!solidBeta) solidBeta = [];
	    if (!solidC) solidC = [];

	    var nsolid = solidBeta.length;

	    // Sanity check
	    if (c.length !== ncomp || model.length !== ncomp || model[0].length !== nspec || solidC.length !== nsolid || solidModel.length !== ncomp || solidModel[0] && solidModel[0].length !== nsolid) {
	        throw new Error('Invalid arguments');
	    }

	    model = new Matrix(model);
	    if (nsolid) {
	        solidModel = new Matrix(solidModel);
	        var lnSolidBeta = new Matrix([solidBeta.map(Math.log2)]);
	        solidC = new Matrix([solidC]);
	    }
	    // Prevent numerical difficulties
	    for (var i = 0; i < cTotal.length; i++) {
	        if (cTotal[i] === 0) cTotal[i] = 1e-15;
	    }

	    c = new Matrix([c]);

	    var maxIt = 99;
	    for (i = 0; i < maxIt; i++) {
	        // console.log('iteration' , i);
	        // console.log(c, solidC)

	        // First we determine which solids are not completely dissolved and need to be included in newton
	        // For this we compute the solubility products and compare it to the equilibrium constants
	        var solidIndices = [];
	        if (nsolid) {
	            var Ksp = stat.product(c.transpose().repeat(1, nsolid).pow(solidModel), 0);
	            Ksp.forEach(function (k, idx) {
	                if (k > solidBeta[idx]) {
	                    // The computed solubility product is greater than maximum value
	                    solidIndices.push(idx);
	                } else if (solidC[0][idx] > 0) {
	                    // solid concentration is not 0
	                    solidIndices.push(idx);
	                } else if (Math.abs(k - solidBeta[idx]) < 1e-15) {
	                    // diff is negative but small, we keep it in the model
	                    solidIndices.push(idx);
	                }
	            });
	            //solidIndices = getRange(0, solidC[0].length -1);
	            var lnKsp = Ksp.slice();
	            for (j = 0; j < lnKsp.length; j++) {
	                lnKsp[j] = Math.log2(lnKsp[j]);
	            }
	        }

	        // console.log(solidIndices);
	        var nSolidPicked = solidIndices.length;
	        if (nSolidPicked) {
	            var solidCPicked = solidC.selection([0], solidIndices);
	            var solidModelPicked = solidModel.selection(getRange(0, ncomp - 1), solidIndices);
	        }

	        var njstar = ncomp + nSolidPicked;

	        // Calculate all species concentrations from component concentrations
	        // console.log('c', c.to1DArray());
	        var cSpec = Matrix.multiply([stat.product(c.transpose().repeat(1, nspec).pow(model), 0)], [beta]);
	        // console.log('cSpec', cSpec);
	        // Compute total concentration of each component based on dissolved species
	        var cTotCalc = new Matrix([stat.sum(Matrix.multiply(cSpec.repeat(ncomp, 1), model), 1)]);

	        // console.log('number of solids', nSolidPicked);
	        // Add to it "concentrations" based on solid species
	        if (nsolid) cTotCalc.add([stat.sum(Matrix.multiply(solidC.repeat(ncomp, 1), solidModel), 1)]);

	        // console.log(cTotal, cTotCalc);
	        // d is the difference between expected total concentration and actual total concentration given
	        // console.log('cTotCalc', cTotCalc.to1DArray());
	        var d = Matrix.subtract([cTotal], cTotCalc);
	        if (nSolidPicked) {
	            var dK = Matrix.subtract(lnSolidBeta, [lnKsp]).selection([0], solidIndices);
	            var dkOrig = Matrix.subtract([solidBeta], [Ksp]).selection([0], solidIndices);
	            var dAll = new Matrix(1, njstar);
	            dAll.setSubMatrix(d, 0, 0);
	            dAll.setSubMatrix(dK, 0, ncomp);
	        } else {
	            dAll = d;
	        }

	        // console.log('diff solution', d.to1DArray());
	        if (nsolid) {}
	        // console.log('solidC', solidC.to1DArray());
	        // console.log('picked ids', solidIndices);


	        // console.log('dkorig', dkOrig);
	        if (checkEpsilon(d[0]) && checkSolid(solidC, dkOrig)) {
	            // console.log('final solution concentrations',c);
	            // console.log('final solid concentrations', solidC);
	            console.log('solution converged in ' + i + ' iterations');
	            return cSpec.to1DArray().concat(solidC.to1DArray ? solidC.to1DArray() : solidC);
	        }

	        // We decompose the Jacobian (Jstar is symetric and easier to inverse)
	        var Jstar = new Matrix(njstar, njstar).fill(0);

	        // Fill the part of Jstar specific to dissolved variables
	        for (var j = 0; j < ncomp; j++) {
	            for (var k = j; k < ncomp; k++) {
	                for (var l = 0; l < nspec; l++) {
	                    Jstar[j][k] += model[k][l] * model[j][l] * cSpec[0][l];
	                    Jstar[k][j] = Jstar[j][k];
	                }
	            }
	        }

	        // Fill the part of jstar specific to solid part
	        for (j = 0; j < ncomp; j++) {
	            for (k = 0; k < nSolidPicked; k++) {
	                var jk = k + ncomp;
	                Jstar[j][jk] = solidModelPicked[j][k];
	                Jstar[jk][j] = solidModelPicked[j][k];
	            }
	        }

	        // console.log('jstar', Jstar);
	        // console.log('inter', d, d.mmul(Jstar.inv()));
	        // We compute the next delta of component concentrations and apply it to the current component concentrations
	        var diag = Matrix.identity(njstar).setSubMatrix(Matrix.diag(c[0]), 0, 0);
	        var deltaC = dAll.mmul(Jstar.inverse()).mmul(diag);

	        var allC = new Matrix(1, njstar);
	        allC.setSubMatrix(c, 0, 0);
	        if (nSolidPicked) {
	            allC.setSubMatrix(solidCPicked, 0, ncomp);
	        }
	        // console.log('deltaC', deltaC);
	        allC.add(deltaC);
	        // console.log('c', c);
	        // c should be positive. If it's not we want to subtract some of the deltaC we've added
	        // We do this iteratively until either nothing is negative anymore or deltaC has become very small
	        while (checkNeg(allC[0])) {
	            deltaC = deltaC.multiply(0.5);
	            allC.subtract(deltaC);
	            if (checkEpsilon(deltaC[0])) break;
	        }

	        // console.log('allC', allC.to1DArray());

	        for (j = 0; j < c.columns; j++) {
	            c.set(0, j, allC.get(0, j));
	        }
	        for (j = 0; j < nSolidPicked; j++) {
	            var val = allC.get(0, ncomp + j);
	            if (val < 0) solidC.set(0, solidIndices[j], 0);else solidC.set(0, solidIndices[j], val);
	        }
	    }

	    if (i >= maxIt) {
	        console.log('did not converge');
	        return null;
	    }
	    // console.log('insoluble indices', solidIndices);
	    return cSpec.to1DArray().concat(solidC.to1DArray ? solidC.to1DArray() : solidC);
	}

	module.exports = newtonRaphton;

	// Returns true if all elements in the array are smaller than 1e-15
	function checkEpsilon(arr, n) {
	    return !arr.some(function (el, idx) {
	        if (n && idx >= n) return false;
	        return Math.abs(el) >= 1e-15;
	    });
	}

	function checkSolid(c, dk) {
	    if (!c.length) return true;
	    return !c[0].some(function (value, idx) {
	        return value !== 0 && Math.abs(dk[idx]) >= 1e-15;
	    });
	}

	// return true if any element is negative
	function checkNeg(arr, n) {
	    return arr.some(function (el, idx) {
	        if (n && idx >= n) return true;
	        return el <= 0;
	    });
	}

	function checkAllNeg(arr) {
	    return !arr.some(function (el) {
	        return el > 0;
	    });
	}

	function getRange(start, end) {
	    var arr = [];
	    for (var i = start; i <= end; i++) {
	        arr.push(i);
	    }
	    return arr;
	}

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var database = __webpack_require__(33);
	var EquationSet = __webpack_require__(34);
	var deepcopy = __webpack_require__(40);

	var defaultOptions = {
	    solvent: 'H2O'
	};

	var Factory = function () {
	    function Factory(options) {
	        _classCallCheck(this, Factory);

	        this.atEquilibrium = new Set();
	        options = Object.assign({}, defaultOptions, options);
	        var db = options.database || database;
	        if (options.extend && options.database) db = db.concat(database);
	        db = processDB(db, options);
	        this.species = {};
	        this.options = options;
	        this.eqSet = new EquationSet(db);
	        this.addSpecie(options.solvent);
	    }

	    _createClass(Factory, [{
	        key: 'getSpecies',
	        value: function getSpecies(filtered, type) {
	            var species = filtered ? Object.keys(this.species).concat(this.options.solvent) : null;
	            return this.eqSet.getSpecies(species, type);
	        }
	    }, {
	        key: 'disableEquation',
	        value: function disableEquation(formedSpecie) {
	            this.eqSet.disableEquation(formedSpecie, true);
	        }
	    }, {
	        key: 'enableEquation',
	        value: function enableEquation(formedSpecie) {
	            this.eqSet.enableEquation(formedSpecie, true);
	        }
	    }, {
	        key: 'addSpecie',
	        value: function addSpecie(label, total) {
	            total = total || 0;
	            if (label === this.solvent) {
	                total = 0;
	            }
	            if (!this.species[label]) {
	                this.species[label] = total;
	            } else {
	                this.species[label] += total;
	            }
	        }
	    }, {
	        key: 'getComponents',
	        value: function getComponents(filtered, type) {
	            var species = filtered ? Object.keys(this.species).concat(this.options.solvent) : null;
	            return this.eqSet.getNormalized(this.options.solvent).getComponents(species, type);
	        }
	    }, {
	        key: 'setTotal',
	        value: function setTotal(label, total) {
	            this.species[label] = total;
	            this.atEquilibrium.delete(label);
	        }
	    }, {
	        key: 'setAtEquilibrium',
	        value: function setAtEquilibrium(label, value) {
	            this.species[label] = value;
	            this.atEquilibrium.add(label);
	        }
	    }, {
	        key: 'setOptions',
	        value: function setOptions(options) {
	            this.options = options;
	        }
	    }, {
	        key: 'getEquilibrium',
	        value: function getEquilibrium() {
	            return new Equilibrium(this.getModel(), this.options);
	        }
	    }, {
	        key: 'getModel',
	        value: function getModel() {
	            var _this = this;

	            var subSet = this.eqSet.getSubset(Object.keys(this.species));
	            var normSet = subSet.getNormalized(this.options.solvent);
	            var model = normSet.getModel(this.species, true);
	            model.components.forEach(function (c) {
	                if (_this.atEquilibrium.has(c.label)) {
	                    c.atEquilibrium = _this.species[c.label];
	                    delete c.total;
	                }
	            });
	            return model;
	        }
	    }, {
	        key: 'getEquations',
	        value: function getEquations(filtered, normalized) {
	            var eqSet = this.eqSet;
	            if (filtered) {
	                eqSet = this.eqSet.getSubset(Object.keys(this.species));
	            }
	            if (normalized) {
	                eqSet = eqSet.getNormalized(this.options.solvent);
	            }
	            return eqSet.getEquations();
	        }
	    }]);

	    return Factory;
	}();

	module.exports = Factory;

	function processDB(db, options) {
	    db = deepcopy(db);
	    var toRemove = [];
	    for (var i = 0; i < db.length; i++) {
	        if (typeof db[i].pK !== 'number' || options.solvent !== 'H2O') {
	            if (!db[i].pK[options.solvent]) {
	                toRemove.push(i);
	            } else {
	                db[i].pK = db[i].pK[options.solvent];
	            }
	        }
	    }

	    for (i = db.length - 1; i >= 0; i--) {
	        if (toRemove.indexOf(i) > -1) {
	            db.splice(i, 1);
	        }
	    }

	    return db;
	}

/***/ },
/* 33 */
/***/ function(module, exports) {

	module.exports = [
		{
			"formed": "HIO3",
			"components": {
				"IO3-": 1,
				"H+": 1
			},
			"pK": 0.8,
			"type": "acidoBasic"
		},
		{
			"formed": "HOCN",
			"components": {
				"OCN-": 1,
				"H+": 1
			},
			"pK": 3.48,
			"type": "acidoBasic"
		},
		{
			"formed": "HBrO",
			"components": {
				"BrO-": 1,
				"H+": 1
			},
			"pK": 8.6,
			"type": "acidoBasic"
		},
		{
			"formed": "CH2ClCO2H",
			"components": {
				"CH2ClCO2-": 1,
				"H+": 1
			},
			"pK": 2.89,
			"type": "acidoBasic"
		},
		{
			"formed": "C6H5COOH",
			"components": {
				"C6H5COO-": 1,
				"H+": 1
			},
			"pK": 4.2,
			"type": "acidoBasic"
		},
		{
			"formed": "C6H5NH3+",
			"components": {
				"C6H5NH2": 1,
				"H+": 1
			},
			"pK": 4.6,
			"type": "acidoBasic"
		},
		{
			"formed": "C2H5COOH",
			"components": {
				"C2H5COO-": 1,
				"H+": 1
			},
			"pK": 4.87,
			"type": "acidoBasic"
		},
		{
			"formed": "C5H5NH+",
			"components": {
				"C5H5N": 1,
				"H+": 1
			},
			"pK": 5.25,
			"type": "acidoBasic"
		},
		{
			"formed": "CH3NH3+",
			"components": {
				"CH3NH2": 1,
				"H+": 1
			},
			"pK": 10.66,
			"type": "acidoBasic"
		},
		{
			"formed": "(C2H5)3NH+",
			"components": {
				"(C2H5)3N": 1,
				"H+": 1
			},
			"pK": 10.75,
			"type": "acidoBasic"
		},
		{
			"formed": "C2H5NH3+",
			"components": {
				"C2H5NH2": 1,
				"H+": 1
			},
			"pK": 10.8,
			"type": "acidoBasic"
		},
		{
			"formed": "HClO4",
			"components": {
				"ClO4-": 1,
				"H+": 1
			},
			"pK": -7,
			"type": "acidoBasic"
		},
		{
			"formed": "HCl",
			"components": {
				"Cl-": 1,
				"H+": 1
			},
			"pK": -3,
			"type": "acidoBasic"
		},
		{
			"formed": "H2SO4",
			"components": {
				"HSO4-": 1,
				"H+": 1
			},
			"pK": -3,
			"type": "acidoBasic"
		},
		{
			"formed": "HNO3",
			"components": {
				"NO3-": 1,
				"H+": 1
			},
			"pK": -1,
			"type": "acidoBasic"
		},
		{
			"formed": "H2SO3",
			"components": {
				"HSO3-": 1,
				"H+": 1
			},
			"pK": 1.8,
			"type": "acidoBasic"
		},
		{
			"formed": "HSO4-",
			"components": {
				"SO4--": 1,
				"H+": 1
			},
			"pK": 1.9,
			"type": "acidoBasic"
		},
		{
			"formed": "HClO2",
			"components": {
				"ClO2-": 1,
				"H+": 1
			},
			"pK": 1.93,
			"type": "acidoBasic"
		},
		{
			"formed": "H2PO3",
			"components": {
				"HPO3-": 1,
				"H+": 1
			},
			"pK": 2,
			"type": "acidoBasic"
		},
		{
			"formed": "Fe(H2O)6+++",
			"components": {
				"Fe(H2O)5OH++": 1,
				"H+": 1
			},
			"pK": 2.1,
			"type": "acidoBasic"
		},
		{
			"formed": "H3PO4",
			"components": {
				"H2PO4-": 1,
				"H+": 1
			},
			"pK": 2.12,
			"type": "acidoBasic"
		},
		{
			"formed": "HF",
			"components": {
				"F-": 1,
				"H+": 1
			},
			"pK": 3.2,
			"type": "acidoBasic"
		},
		{
			"formed": "HNO2",
			"components": {
				"NO2-": 1,
				"H+": 1
			},
			"pK": 3.35,
			"type": "acidoBasic"
		},
		{
			"formed": "HCO2H",
			"components": {
				"HCO2-": 1,
				"H+": 1
			},
			"pK": 3.75,
			"type": "acidoBasic"
		},
		{
			"formed": "CH3CO2H",
			"components": {
				"CH3COO-": 1,
				"H+": 1
			},
			"pK": 4.7,
			"type": "acidoBasic"
		},
		{
			"formed": "Al(H2O)6+++",
			"components": {
				"Al(H2O)5OH++": 1,
				"H+": 1
			},
			"pK": 4.9,
			"type": "acidoBasic"
		},
		{
			"formed": "H2CO3",
			"components": {
				"HCO3-": 1,
				"H+": 1
			},
			"pK": 6.3,
			"type": "acidoBasic"
		},
		{
			"formed": "HPO3-",
			"components": {
				"PO3--": 1,
				"H+": 1
			},
			"pK": 6.59,
			"type": "acidoBasic"
		},
		{
			"formed": "H2S",
			"components": {
				"HS-": 1,
				"H+": 1
			},
			"pK": 7.04,
			"type": "acidoBasic"
		},
		{
			"formed": "HSO3-",
			"components": {
				"SO3--": 1,
				"H+": 1
			},
			"pK": 7.21,
			"type": "acidoBasic"
		},
		{
			"formed": "HClO",
			"components": {
				"ClO-": 1,
				"H+": 1
			},
			"pK": 8,
			"type": "acidoBasic"
		},
		{
			"formed": "HCN",
			"components": {
				"CN-": 1,
				"H+": 1
			},
			"pK": 9.2,
			"type": "acidoBasic"
		},
		{
			"formed": "NH4+",
			"components": {
				"NH3": 1,
				"H+": 1
			},
			"pK": 9.25,
			"type": "acidoBasic"
		},
		{
			"formed": "HCO3-",
			"components": {
				"CO3--": 1,
				"H+": 1
			},
			"pK": 10.33,
			"type": "acidoBasic"
		},
		{
			"formed": "H2PO4-",
			"components": {
				"HPO4--": 1,
				"H+": 1
			},
			"pK": 7.2,
			"type": "acidoBasic"
		},
		{
			"formed": "HPO4--",
			"components": {
				"PO4---": 1,
				"H+": 1
			},
			"pK": 12.32,
			"type": "acidoBasic"
		},
		{
			"formed": "H2O",
			"components": {
				"OH-": 1,
				"H+": 1
			},
			"pK": 14,
			"type": "acidoBasic"
		},
		{
			"formed": "HS-",
			"components": {
				"S--": 1,
				"H+": 1
			},
			"pK": 19,
			"type": "acidoBasic"
		},
		{
			"formed": "NH3",
			"components": {
				"NH2-": 1,
				"H+": 1
			},
			"pK": 23,
			"type": "acidoBasic"
		},
		{
			"formed": "Ag(NH3)2+",
			"components": {
				"Ag+": 1,
				"NH3": 2
			},
			"pK": 7.2,
			"type": "complexation"
		},
		{
			"formed": "Zn(NH3)4++",
			"components": {
				"Zn++": 1,
				"NH3": 4
			},
			"pK": 8.89,
			"type": "complexation"
		},
		{
			"formed": "Cu(NH3)4++",
			"components": {
				"Cu++": 1,
				"NH3": 4
			},
			"pK": 13.04,
			"type": "complexation"
		},
		{
			"formed": "Hg(NH3)4++",
			"components": {
				"Hg++": 1,
				"NH3": 4
			},
			"pK": 19.26,
			"type": "complexation"
		},
		{
			"formed": "Co(NH3)6++",
			"components": {
				"Co++": 1,
				"NH3": 6
			},
			"pK": 4.7,
			"type": "complexation"
		},
		{
			"formed": "Co(NH3)4+++",
			"components": {
				"Co+++": 1,
				"NH3": 4
			},
			"pK": 33.66,
			"type": "complexation"
		},
		{
			"formed": "Cd(NH3)6++",
			"components": {
				"Cd++": 1,
				"NH3": 6
			},
			"pK": 5.41,
			"type": "complexation"
		},
		{
			"formed": "Cd(NH3)4++",
			"components": {
				"Cd++": 1,
				"NH3": 4
			},
			"pK": 7,
			"type": "complexation"
		},
		{
			"formed": "Ni(NH3)6++",
			"components": {
				"Ni++": 1,
				"NH3": 6
			},
			"pK": 8.3,
			"type": "complexation"
		},
		{
			"formed": "Fe(CN)6----",
			"components": {
				"Fe++": 1,
				"CN-": 6
			},
			"pK": 35,
			"type": "complexation"
		},
		{
			"formed": "Fe(CN)6---",
			"components": {
				"Fe+++": 1,
				"CN-": 6
			},
			"pK": 41.96,
			"type": "complexation"
		},
		{
			"formed": "Ag(CN)2-",
			"components": {
				"Ag+": 1,
				"CN-": 2
			},
			"pK": 18.72,
			"type": "complexation"
		},
		{
			"formed": "Cu(CN)2-",
			"components": {
				"Cu+": 1,
				"CN-": 2
			},
			"pK": 16,
			"type": "complexation"
		},
		{
			"formed": "Cd(CN)4--",
			"components": {
				"Cd++": 1,
				"CN-": 4
			},
			"pK": 16.89,
			"type": "complexation"
		},
		{
			"formed": "Au(CN)2-",
			"components": {
				"Au+": 1,
				"CN-": 2
			},
			"pK": 38.3,
			"type": "complexation"
		},
		{
			"formed": "Ni(CN)4--",
			"components": {
				"Ni++": 1,
				"CN-": 4
			},
			"pK": 31,
			"type": "complexation"
		},
		{
			"formed": "AlF6---",
			"components": {
				"Al+++": 1,
				"F-": 6
			},
			"pK": 4.4,
			"type": "complexation"
		},
		{
			"formed": "AlF4-",
			"components": {
				"Al+++": 1,
				"F-": 4
			},
			"pK": 8.3,
			"type": "complexation"
		},
		{
			"formed": "BeF4--",
			"components": {
				"Be++": 1,
				"F-": 4
			},
			"pK": 13.11,
			"type": "complexation"
		},
		{
			"formed": "SnF6--",
			"components": {
				"Sn++++": 1,
				"F-": 6
			},
			"pK": 25,
			"type": "complexation"
		},
		{
			"formed": "CuCl2-",
			"components": {
				"Cu+": 1,
				"Cl-": 2
			},
			"pK": 5.48,
			"type": "complexation"
		},
		{
			"formed": "AgCl2-",
			"components": {
				"Ag+": 1,
				"Cl-": 2
			},
			"pK": 5.26,
			"type": "complexation"
		},
		{
			"formed": "PbCl4--",
			"components": {
				"Pb++": 1,
				"Cl-": 4
			},
			"pK": 15.4,
			"type": "complexation"
		},
		{
			"formed": "HgCl4--",
			"components": {
				"Hg++": 1,
				"Cl-": 4
			},
			"pK": 15.7,
			"type": "complexation"
		},
		{
			"formed": "CuBr2-",
			"components": {
				"Cu+": 1,
				"Br-": 2
			},
			"pK": 5.9,
			"type": "complexation"
		},
		{
			"formed": "AgBr2-",
			"components": {
				"Ag+": 1,
				"Br-": 2
			},
			"pK": 11,
			"type": "complexation"
		},
		{
			"formed": "HgBr4--",
			"components": {
				"Hg++": 1,
				"Br-": 4
			},
			"pK": 4.48,
			"type": "complexation"
		},
		{
			"formed": "CuI2-",
			"components": {
				"Cu+": 1,
				"I-": 2
			},
			"pK": 8.9,
			"type": "complexation"
		},
		{
			"formed": "AgI2-",
			"components": {
				"Ag+": 1,
				"I-": 2
			},
			"pK": 11,
			"type": "complexation"
		},
		{
			"formed": "PbI4--",
			"components": {
				"Pb++": 1,
				"I-": 4
			},
			"pK": 4.48,
			"type": "complexation"
		},
		{
			"formed": "HgI4--",
			"components": {
				"Hg++": 1,
				"I-": 4
			},
			"pK": 30.28,
			"type": "complexation"
		},
		{
			"formed": "Ag(CH3NH2)2+",
			"components": {
				"Ag+": 1,
				"CH3NH2": 2
			},
			"pK": 6.89,
			"type": "complexation"
		},
		{
			"formed": "Ag(S2O3)2---",
			"components": {
				"Ag+": 1,
				"S2O3--": 2
			},
			"pK": 13.46,
			"type": "complexation"
		},
		{
			"formed": "Cd(SCN)4--",
			"components": {
				"Cd++": 1,
				"SCN-": 4
			},
			"pK": 3,
			"type": "complexation"
		},
		{
			"formed": "Cu(SCN)2",
			"components": {
				"Cu++": 1,
				"SCN-": 2
			},
			"pK": 3.75,
			"type": "complexation"
		},
		{
			"formed": "Fe(SCN)3",
			"components": {
				"Fe+++": 1,
				"SCN-": 3
			},
			"pK": 6.3,
			"type": "complexation"
		},
		{
			"formed": "Hg(SCN)4--",
			"components": {
				"Hg++": 1,
				"SCN-": 4
			},
			"pK": 21.7,
			"type": "complexation"
		},
		{
			"formed": "Cu(OH)4--",
			"components": {
				"Cu++": 1,
				"OH-": 4
			},
			"pK": 16.11,
			"type": "complexation"
		},
		{
			"formed": "Zn(OH)4--",
			"components": {
				"Zn++": 1,
				"OH-": 4
			},
			"pK": 15.45,
			"type": "complexation"
		},
		{
			"formed": "Mn(en)3++",
			"components": {
				"Mn++": 1,
				"en": 1
			},
			"pK": 5.81,
			"type": "complexation"
		},
		{
			"formed": "Fe(en)3++",
			"components": {
				"Fe++": 1,
				"en": 1
			},
			"pK": 9.72,
			"type": "complexation"
		},
		{
			"formed": "Co(en)3++",
			"components": {
				"Co++": 1,
				"en": 1
			},
			"pK": 14.11,
			"type": "complexation"
		},
		{
			"formed": "Co(en)3+++",
			"components": {
				"Co+++": 1,
				"en": 1
			},
			"pK": 48.68,
			"type": "complexation"
		},
		{
			"formed": "Ni(en)3++",
			"components": {
				"Ni++": 1,
				"en": 1
			},
			"pK": 17.61,
			"type": "complexation"
		},
		{
			"formed": "Cu(en)2++",
			"components": {
				"Cu++": 1,
				"en": 1
			},
			"pK": 19.54,
			"type": "complexation"
		},
		{
			"formed": "Co(C2O4)3----",
			"components": {
				"Co++": 1,
				"C2O4--": 3
			},
			"pK": 6.65,
			"type": "complexation"
		},
		{
			"formed": "Fe(C2O4)3---",
			"components": {
				"Fe+++": 1,
				"C2O4--": 3
			},
			"pK": 20.52,
			"type": "complexation"
		},
		{
			"formed": "AgBr",
			"components": {
				"Ag+": 1,
				"Br-": 1
			},
			"pK": 12.27,
			"type": "precipitation"
		},
		{
			"formed": "AgBrO3",
			"components": {
				"Ag+": 1,
				"BrO3-": 1
			},
			"pK": 4.24,
			"type": "precipitation"
		},
		{
			"formed": "Ag2CO3",
			"components": {
				"Ag+": 2,
				"CO3--": 1
			},
			"pK": 11.1,
			"type": "precipitation"
		},
		{
			"formed": "AgCl",
			"components": {
				"Ag+": 1,
				"Cl-": 1
			},
			"pK": 9.74,
			"type": "precipitation"
		},
		{
			"formed": "Ag2CrO4",
			"components": {
				"Ag+": 2,
				"CrO4--": 1
			},
			"pK": 11.05,
			"type": "precipitation"
		},
		{
			"formed": "AgI",
			"components": {
				"Ag+": 1,
				"I-": 1
			},
			"pK": 16.07,
			"type": "precipitation"
		},
		{
			"formed": "AgOH",
			"components": {
				"Ag+": 1,
				"OH-": 1
			},
			"pK": 7.72,
			"type": "precipitation"
		},
		{
			"formed": "Ag2S",
			"components": {
				"Ag+": 2,
				"S--": 1
			},
			"pK": 50.22,
			"type": "precipitation"
		},
		{
			"formed": "Al(OH)3",
			"components": {
				"Al+++": 1,
				"OH-": 3
			},
			"pK": 32.74,
			"type": "precipitation"
		},
		{
			"formed": "BaCO3",
			"components": {
				"Ba++": 1,
				"CO3--": 1
			},
			"pK": 8.7,
			"type": "precipitation"
		},
		{
			"formed": "BaCrO4",
			"components": {
				"Ba++": 1,
				"CrO4--": 1
			},
			"pK": 10.07,
			"type": "precipitation"
		},
		{
			"formed": "BaF2",
			"components": {
				"Ba++": 1,
				"F-": 2
			},
			"pK": 6.74,
			"type": "precipitation"
		},
		{
			"formed": "BaSO4",
			"components": {
				"Ba++": 1,
				"SO4--": 1
			},
			"pK": 9.96,
			"type": "precipitation"
		},
		{
			"formed": "Bi2S3",
			"components": {
				"Bi+++": 2,
				"S--": 3
			},
			"pK": 71.8,
			"type": "precipitation"
		},
		{
			"formed": "CaCO3",
			"components": {
				"Ca++": 1,
				"CO3--": 1
			},
			"pK": 8.47,
			"type": "precipitation"
		},
		{
			"formed": "CaF2",
			"components": {
				"Ca++": 1,
				"F-": 2
			},
			"pK": 10.46,
			"type": "precipitation"
		},
		{
			"formed": "Ca(OH)2",
			"components": {
				"Ca++": 1,
				"OH-": 2
			},
			"pK": 5.3,
			"type": "precipitation"
		},
		{
			"formed": "Ca3(PO4)2",
			"components": {
				"Ca++": 3,
				"PO4---": 2
			},
			"pK": 32.68,
			"type": "precipitation"
		},
		{
			"formed": "CaSO4",
			"components": {
				"Ca++": 1,
				"SO4--": 1
			},
			"pK": 4.35,
			"type": "precipitation"
		},
		{
			"formed": "CdS",
			"components": {
				"Cd++": 1,
				"S--": 1
			},
			"pK": 28,
			"type": "precipitation"
		},
		{
			"formed": "CuCl",
			"components": {
				"Cu+": 1,
				"Cl-": 1
			},
			"pK": 6.77,
			"type": "precipitation"
		},
		{
			"formed": "Cu(OH)2",
			"components": {
				"Cu++": 1,
				"OH-": 2
			},
			"pK": 18.8,
			"type": "precipitation"
		},
		{
			"formed": "CuS",
			"components": {
				"Cu++": 1,
				"S--": 1
			},
			"pK": 44.07,
			"type": "precipitation"
		},
		{
			"formed": "Fe(OH)2",
			"components": {
				"Fe++": 1,
				"OH-": 2
			},
			"pK": 16.31,
			"type": "precipitation"
		},
		{
			"formed": "Fe(OH)3",
			"components": {
				"Fe+++": 1,
				"OH-": 3
			},
			"pK": 38.55,
			"type": "precipitation"
		},
		{
			"formed": "FeS",
			"components": {
				"Fe++": 1,
				"S--": 1
			},
			"pK": 18.22,
			"type": "precipitation"
		},
		{
			"formed": "Hg2Cl2",
			"components": {
				"Hg+": 2,
				"Cl-": 2
			},
			"pK": 17.85,
			"type": "precipitation"
		},
		{
			"formed": "Li2CO3",
			"components": {
				"Li+": 2,
				"CO3--": 1
			},
			"pK": 2.96,
			"type": "precipitation"
		},
		{
			"formed": "MgCO3",
			"components": {
				"Mg++": 1,
				"CO3--": 1
			},
			"pK": 4.17,
			"type": "precipitation"
		},
		{
			"formed": "Mg(OH)2",
			"components": {
				"Mg++": 1,
				"OH-": 2
			},
			"pK": 11.15,
			"type": "precipitation"
		},
		{
			"formed": "Mn(OH)2",
			"components": {
				"Mn--": 1,
				"OH-": 2
			},
			"pK": 12.7,
			"type": "precipitation"
		},
		{
			"formed": "PbCl2",
			"components": {
				"Pb++": 1,
				"Cl-": 2
			},
			"pK": 4.77,
			"type": "precipitation"
		},
		{
			"formed": "PbCrO4",
			"components": {
				"Pb++": 1,
				"CrO4--": 1
			},
			"pK": 15.7,
			"type": "precipitation"
		},
		{
			"formed": "PbI2",
			"components": {
				"Pb++": 1,
				"I--": 2
			},
			"pK": 7.85,
			"type": "precipitation"
		},
		{
			"formed": "Pb(OH)2",
			"components": {
				"Pb++": 1,
				"OH-": 2
			},
			"pK": 14.92,
			"type": "precipitation"
		},
		{
			"formed": "PbS",
			"components": {
				"Pb++": 1,
				"S--": 1
			},
			"pK": 28.15,
			"type": "precipitation"
		},
		{
			"formed": "PbSO4",
			"components": {
				"Pb++": 1,
				"SO4--": 1
			},
			"pK": 7.8,
			"type": "precipitation"
		},
		{
			"formed": "Zn(OH)2",
			"components": {
				"Zn++": 1,
				"OH-": 2
			},
			"pK": 16.35,
			"type": "precipitation"
		},
		{
			"formed": "ZnS",
			"components": {
				"Zn++": 1,
				"S--": 1
			},
			"pK": 22.52,
			"type": "precipitation"
		}
	];

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Equation = __webpack_require__(39);

	var EquationSet = function () {
	    function EquationSet(equations) {
	        _classCallCheck(this, EquationSet);

	        equations = equations || [];
	        this._normalized = false;
	        this._disabledKeys = new Set();
	        this.equations = new Map();
	        for (var i = 0; i < equations.length; i++) {
	            this.add(equations[i]);
	        }
	    }

	    _createClass(EquationSet, [{
	        key: Symbol.iterator,
	        value: function value() {
	            return this.equations.values();
	        }
	    }, {
	        key: 'add',
	        value: function add(eq, key) {
	            var equation = Equation.create(eq);
	            key = key || getHash(eq.formed);
	            this.equations.set(key, equation);
	            this._normalized = false;
	        }
	    }, {
	        key: 'has',
	        value: function has(eq) {
	            if (eq instanceof Equation) {
	                var key = getHash(eq.formed);
	            } else {
	                key = eq;
	            }
	            return this.equations.has(key);
	        }
	    }, {
	        key: 'getSpecies',
	        value: function getSpecies(species, type) {
	            var speciesSet = new Set();
	            var _iteratorNormalCompletion = true;
	            var _didIteratorError = false;
	            var _iteratorError = undefined;

	            try {
	                for (var _iterator = this.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	                    var _step$value = _slicedToArray(_step.value, 2);

	                    var key = _step$value[0];
	                    var eq = _step$value[1];

	                    if (this._disabledKeys.has(key)) continue;
	                    if (type && type !== eq.type) continue;
	                    if (species) {
	                        if (species.indexOf(eq.formed) > -1) {
	                            speciesSet.add(eq.formed);
	                            Object.keys(eq.components).forEach(function (c) {
	                                return speciesSet.add(c);
	                            });
	                        } else {
	                            Object.keys(eq.components).forEach(function (c) {
	                                if (species.indexOf(c) > -1) speciesSet.add(c);
	                            });
	                        }
	                    } else {
	                        speciesSet.add(eq.formed);
	                        Object.keys(eq.components).forEach(function (c) {
	                            return speciesSet.add(c);
	                        });
	                    }
	                }
	            } catch (err) {
	                _didIteratorError = true;
	                _iteratorError = err;
	            } finally {
	                try {
	                    if (!_iteratorNormalCompletion && _iterator.return) {
	                        _iterator.return();
	                    }
	                } finally {
	                    if (_didIteratorError) {
	                        throw _iteratorError;
	                    }
	                }
	            }

	            return Array.from(speciesSet);
	        }
	    }, {
	        key: 'getComponents',
	        value: function getComponents(species, type) {
	            if (!this.isNormalized()) {
	                throw new Error('Cannot get components from non-normalized equation set');
	            }
	            var speciesSet = new Set();
	            var _iteratorNormalCompletion2 = true;
	            var _didIteratorError2 = false;
	            var _iteratorError2 = undefined;

	            try {
	                for (var _iterator2 = this.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	                    var _step2$value = _slicedToArray(_step2.value, 2);

	                    var key = _step2$value[0];
	                    var eq = _step2$value[1];

	                    if (this._disabledKeys.has(key)) continue;
	                    if (type && type !== eq.type) continue;
	                    if (species) {
	                        if (species.indexOf(eq.formed) > -1) {
	                            Object.keys(eq.components).forEach(function (c) {
	                                return speciesSet.add(c);
	                            });
	                        } else {
	                            Object.keys(eq.components).forEach(function (c) {
	                                if (species.indexOf(c) > -1) speciesSet.add(c);
	                            });
	                        }
	                    } else {
	                        Object.keys(eq.components).forEach(function (c) {
	                            return speciesSet.add(c);
	                        });
	                    }
	                }
	            } catch (err) {
	                _didIteratorError2 = true;
	                _iteratorError2 = err;
	            } finally {
	                try {
	                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
	                        _iterator2.return();
	                    }
	                } finally {
	                    if (_didIteratorError2) {
	                        throw _iteratorError2;
	                    }
	                }
	            }

	            return Array.from(speciesSet);
	        }
	    }, {
	        key: 'disableEquation',
	        value: function disableEquation(key, hashIt) {
	            key = hashIt ? getHash(key) : key;
	            this._disabledKeys.add(key);
	        }
	    }, {
	        key: 'enableEquation',
	        value: function enableEquation(key, hashIt) {
	            key = hashIt ? getHash(key) : key;
	            this._disabledKeys.delete(key);
	        }
	    }, {
	        key: 'get',
	        value: function get(id, hashIt) {
	            var key;
	            if (hashIt) {
	                key = getHash(id);
	            } else {
	                key = id;
	            }
	            return this.equations.get(key);
	        }
	    }, {
	        key: 'keys',
	        value: function keys() {
	            return this.equations.keys();
	        }
	    }, {
	        key: 'values',
	        value: function values() {
	            return this.equations.values();
	        }
	    }, {
	        key: 'entries',
	        value: function entries() {
	            return this.equations.entries();
	        }
	    }, {
	        key: 'forEach',
	        value: function forEach() {
	            return this.equations.forEach.apply(this.equations, arguments);
	        }
	    }, {
	        key: 'getNormalized',
	        value: function getNormalized(solvent) {
	            // In a normalized set, formed species can be found in any of the components
	            // of the equation set
	            var norm = new Array(this.equations.size);
	            var keys = new Array(this.equations.size);
	            var idx = 0;
	            var _iteratorNormalCompletion3 = true;
	            var _didIteratorError3 = false;
	            var _iteratorError3 = undefined;

	            try {
	                for (var _iterator3 = this.entries()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
	                    var _step3$value = _slicedToArray(_step3.value, 2);

	                    var key = _step3$value[0];
	                    var entry = _step3$value[1];

	                    norm[idx] = entry.withSolvent(solvent);
	                    keys[idx] = key;
	                    idx++;
	                }
	            } catch (err) {
	                _didIteratorError3 = true;
	                _iteratorError3 = err;
	            } finally {
	                try {
	                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
	                        _iterator3.return();
	                    }
	                } finally {
	                    if (_didIteratorError3) {
	                        throw _iteratorError3;
	                    }
	                }
	            }

	            norm = normalize(norm);

	            var normSet = new EquationSet();
	            for (var i = 0; i < norm.length; i++) {
	                normSet.add(norm[i], keys[i]);
	            }

	            // return a new equation set that has been normalized
	            // normalization requires the solvent to be set
	            normSet._normalized = true;
	            normSet._disabledKeys = new Set(this._disabledKeys);
	            return normSet;
	        }
	    }, {
	        key: 'isNormalized',
	        value: function isNormalized() {
	            return this._normalized;
	        }
	    }, {
	        key: 'getEquations',
	        value: function getEquations() {
	            var _this = this;

	            return Array.from(this.equations).filter(function (e) {
	                return !_this._disabledKeys.has(e[0]);
	            }).map(function (e) {
	                return e[1].toJSON();
	            });
	        }
	    }, {
	        key: 'getModel',
	        value: function getModel(totals, all) {
	            var _this2 = this;

	            if (!this.isNormalized()) {
	                throw new Error('Cannot get model from un-normalized equation set');
	            }
	            var totalComp = {};
	            if (all) {
	                var subset = this;
	            } else {
	                subset = this.getSubset(Object.keys(totals));
	            }
	            var components = subset.components;
	            var subsetKeys = [].concat(_toConsumableArray(subset.keys()));
	            var subsetArr = [].concat(_toConsumableArray(subset.values())).filter(function (s, idx) {
	                return !_this2._disabledKeys.has(subsetKeys[idx]);
	            });
	            components.forEach(function (c) {
	                return totalComp[c] = 0;
	            });
	            for (var key in totals) {
	                if (totals.hasOwnProperty(key)) {
	                    var total = totals[key] || 0;
	                    if (components.indexOf(key) !== -1) {
	                        totalComp[key] += total;
	                    } else {
	                        var eq = subsetArr.find(function (eq) {
	                            return eq.formed === key;
	                        });
	                        if (eq) {
	                            var keys = Object.keys(eq.components);
	                            for (var i = 0; i < keys.length; i++) {
	                                totalComp[keys[i]] += eq.components[keys[i]] * total;
	                            }
	                        }
	                    }
	                }
	            }

	            var model = {
	                volume: 1
	            };

	            model.components = components.map(function (key) {
	                return {
	                    label: key,
	                    total: totalComp[key]
	                };
	            });

	            model.formedSpecies = subsetArr.map(function (eq) {
	                return {
	                    solid: eq.type === 'precipitation',
	                    label: eq.formed,
	                    beta: eq.type === 'precipitation' ? Math.pow(10, -eq.pK) : Math.pow(10, eq.pK),
	                    components: components.map(function (key) {
	                        return eq.components[key] || 0;
	                    })
	                };
	            });

	            return model;
	        }
	    }, {
	        key: 'getSubset',
	        value: function getSubset(species) {
	            var speciesSet = new Set();
	            species.forEach(function (s) {
	                return speciesSet.add(s);
	            });
	            // get a subset of the equations given a set of species
	            var newSet = new EquationSet();
	            this.forEach(function (eq) {
	                if (species.indexOf(eq.formed) !== -1) {
	                    newSet.add(eq);
	                    speciesSet.add(eq.formed);
	                    Object.keys(eq.components).forEach(function (s) {
	                        return speciesSet.add(s);
	                    });
	                }
	            });

	            var moreAdded = true;
	            var passes = 0;
	            while (passes <= 10 && moreAdded) {
	                passes++;
	                moreAdded = false;
	                this.forEach(function (eq) {
	                    var hasAll = !Object.keys(eq.components).some(function (c) {
	                        return !speciesSet.has(c);
	                    });
	                    if (hasAll && !newSet.has(eq)) {
	                        newSet.add(eq);
	                        speciesSet.add(eq.formed);
	                        moreAdded = true;
	                    }
	                });
	            }

	            if (passes === 10) {
	                throw new Error('You might have a circular dependency in your equations');
	            }

	            // Pass along some properties
	            newSet._disabledKeys = new Set(this._disabledKeys);
	            newSet._normalized = this._normalized;
	            return newSet;
	        }
	    }, {
	        key: 'species',
	        get: function get() {
	            return this.getSpecies();
	        }
	    }, {
	        key: 'components',
	        get: function get() {
	            return this.getComponents();
	        }
	    }, {
	        key: 'size',
	        get: function get() {
	            return this.equations.size;
	        }
	    }]);

	    return EquationSet;
	}();

	module.exports = EquationSet;

	function normalize(equations) {
	    var N = equations.length;
	    var newEquations = new Array(N).fill(0);
	    var needs = new Array(N);

	    // First, find the independent equations
	    for (var i = 0; i < N; i++) {
	        if (isIndependent(equations, i)) {
	            newEquations[i] = equations[i];
	        } else {
	            var keys = Object.keys(equations[i].components);
	            needs[i] = keys.map(function (key) {
	                return equations.findIndex(function (eq) {
	                    return eq.formed === key;
	                });
	            });
	        }
	    }

	    var iter = 0;
	    while (!allDefined(newEquations) && iter < 10) {
	        for (var i = 0; i < N; i++) {
	            if (!newEquations[i]) {
	                if (allDefined(newEquations, needs[i])) {
	                    fillLine(equations, newEquations, i);
	                }
	            }
	        }
	        iter++;
	    }
	    if (!allDefined(newEquations)) {
	        throw new Error('There may be a circular dependency in the equations');
	    }
	    return newEquations;
	}

	function isIndependent(equations, idx) {
	    var keys = Object.keys(equations[idx].components);
	    for (var i = 0; i < keys.length; i++) {
	        var key = keys[i];
	        var eq = equations.find(function (eq) {
	            return eq.formed === key;
	        });
	        if (eq) return false;
	    }
	    return true;
	}

	function allDefined(arr, idx) {
	    if (idx !== undefined) {
	        return !idx.some(function (idx) {
	            return idx !== -1 && !arr[idx];
	        });
	    } else {
	        return !arr.some(function (el) {
	            return el === 0;
	        });
	    }
	}

	function fillLine(equations, newEquations, i) {
	    var eq = equations[i];
	    var newEq = {
	        type: eq.type,
	        formed: eq.formed,
	        components: {}
	    };
	    fillRec(equations, eq, newEq, 1);
	    newEquations[i] = newEq;
	}

	function fillRec(equations, eq, eqToFill, n) {
	    var componentsToFill = eqToFill.components;
	    var components = eq.components;
	    var keys = Object.keys(components);

	    var _loop = function _loop(j) {
	        key = keys[j];

	        var nn = n * components[key];
	        rep = equations.find(function (eq) {
	            return eq.formed === keys[j];
	        });

	        if (!rep) {
	            componentsToFill[keys[j]] = componentsToFill[keys[j]] || 0;
	            componentsToFill[keys[j]] += nn;
	        } else {
	            fillRec(equations, rep, eqToFill, nn);
	        }
	    };

	    for (var j = 0; j < keys.length; j++) {
	        var key;
	        var rep;

	        _loop(j);
	    }
	    eqToFill.pK = eqToFill.pK || 0;
	    eqToFill.pK += n * eq.pK;
	}

	function getHash(id) {
	    return new Buffer(id).toString('base64');
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(35).Buffer))

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(36)
	var ieee754 = __webpack_require__(37)
	var isArray = __webpack_require__(38)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
	 *     on objects.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	function typedArraySupport () {
	  function Bar () {}
	  try {
	    var arr = new Uint8Array(1)
	    arr.foo = function () { return 42 }
	    arr.constructor = Bar
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Bar && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    this.length = 0
	    this.parent = undefined
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined') {
	    if (object.buffer instanceof ArrayBuffer) {
	      return fromTypedArray(that, object)
	    }
	    if (object instanceof ArrayBuffer) {
	      return fromArrayBuffer(that, object)
	    }
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    array.byteLength
	    that = Buffer._augment(new Uint8Array(array))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromTypedArray(that, new Uint8Array(array))
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	} else {
	  // pre-set for values that may exist in the future
	  Buffer.prototype.length = undefined
	  Buffer.prototype.parent = undefined
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` is deprecated
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` is deprecated
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; i--) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(35).Buffer, (function() { return this; }())))

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}( false ? (this.base64js = {}) : exports))


/***/ },
/* 37 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 38 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var deepcopy = __webpack_require__(40);
	var types = ['acidoBasic', 'precipitation', 'complexation'];

	var Equation = function () {
	    function Equation(eq) {
	        _classCallCheck(this, Equation);

	        // Sanity checks
	        if (typeof eq.formed !== 'string') throw new Error('equation expects a property "formed" that is a string');
	        if (typeof eq.pK !== 'number') throw new Error('equation expects a property "pK" that is a number');
	        if (types.indexOf(eq.type) === -1) throw new Error('Unexpected type');
	        if (Object.prototype.toString.call(eq.components) !== '[object Object]') throw new Error('Unexpected components');
	        if (Object.keys(eq.components).length < 1) throw new Error('Components is expected to have at least one key');

	        this._eq = deepcopy(eq);
	    }

	    _createClass(Equation, [{
	        key: 'clone',
	        value: function clone() {
	            return new Equation(deepcopy(this._eq));
	        }
	    }, {
	        key: 'toJSON',
	        value: function toJSON() {
	            return this._eq;
	        }

	        // Get a new representation of the equation given a solvent
	        // Returns a new equation that does not include the solvent

	    }, {
	        key: 'withSolvent',
	        value: function withSolvent(solvent) {
	            var eq = {};
	            var comp = this._eq.components;
	            var formed = this._eq.formed;
	            var compKeys = Object.keys(comp);
	            if (formed === solvent) {
	                eq.formed = compKeys[0];
	                eq.components = {};
	                eq.pK = -this._eq.pK;
	                eq.type = this._eq.type;
	                for (var j = 1; j < compKeys.length; j++) {
	                    var compKey = compKeys[j];
	                    eq.components[compKey] = -this._eq.components[compKey];
	                }
	            } else {
	                for (var _j = 0; _j < compKeys.length; _j++) {
	                    var _compKey = compKeys[_j];
	                    if (_compKey === solvent) {
	                        eq = deepcopy(this._eq);
	                        // Remove solvent from equation
	                        delete eq.components[_compKey];
	                        break;
	                    }
	                }
	            }
	            if (!eq.components) {
	                return this.clone();
	            }

	            return new Equation(eq);
	        }
	    }, {
	        key: 'pK',
	        get: function get() {
	            return this._eq.pK;
	        }
	    }, {
	        key: 'formed',
	        get: function get() {
	            return this._eq.formed;
	        }
	    }, {
	        key: 'components',
	        get: function get() {
	            return this._eq.components;
	        }
	    }, {
	        key: 'type',
	        get: function get() {
	            return this._eq.type;
	        }
	    }], [{
	        key: 'create',
	        value: function create(eq) {
	            if (eq instanceof Equation) {
	                return eq.clone();
	            } else {
	                return new Equation(eq);
	            }
	        }
	    }]);

	    return Equation;
	}();

	module.exports = Equation;

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(41);


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _copy = __webpack_require__(42);

	var _polyfill = __webpack_require__(43);

	function defaultCustomizer(target) {
	  return void 0;
	}

	function deepcopy(target) {
	  var customizer = arguments.length <= 1 || arguments[1] === void 0 ? defaultCustomizer : arguments[1];

	  if (target === null) {
	    // copy null
	    return null;
	  }

	  var resultValue = (0, _copy.copyValue)(target);

	  if (resultValue !== null) {
	    // copy some primitive types
	    return resultValue;
	  }

	  var resultCollection = (0, _copy.copyCollection)(target, customizer),
	      clone = resultCollection !== null ? resultCollection : target;

	  var visited = [target],
	      reference = [clone];

	  // recursively copy from collection
	  return recursiveCopy(target, customizer, clone, visited, reference);
	}

	function recursiveCopy(target, customizer, clone, visited, reference) {
	  if (target === null) {
	    // copy null
	    return null;
	  }

	  var resultValue = (0, _copy.copyValue)(target);

	  if (resultValue !== null) {
	    // copy some primitive types
	    return resultValue;
	  }

	  var keys = (0, _polyfill.getKeys)(target).concat((0, _polyfill.getSymbols)(target));

	  var i = void 0,
	      len = void 0;

	  var key = void 0,
	      value = void 0,
	      index = void 0,
	      resultCopy = void 0,
	      result = void 0,
	      ref = void 0;

	  for (i = 0, len = keys.length; i < len; ++i) {
	    key = keys[i];
	    value = target[key];
	    index = (0, _polyfill.indexOf)(visited, value);

	    resultCopy = void 0;
	    result = void 0;
	    ref = void 0;

	    if (index === -1) {
	      resultCopy = (0, _copy.copy)(value, customizer);
	      result = resultCopy !== null ? resultCopy : value;

	      if (value !== null && /^(?:function|object)$/.test(typeof value)) {
	        visited.push(value);
	        reference.push(result);
	      }
	    } else {
	      // circular reference
	      ref = reference[index];
	    }

	    clone[key] = ref || recursiveCopy(value, customizer, result, visited, reference);
	  }

	  return clone;
	}

	exports['default'] = deepcopy;
	module.exports = exports['default'];

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	exports.__esModule = true;
	exports.copyValue = exports.copyCollection = exports.copy = void 0;

	var _polyfill = __webpack_require__(43);

	var toString = Object.prototype.toString;

	function copy(target, customizer) {
	  var resultValue = copyValue(target);

	  if (resultValue !== null) {
	    return resultValue;
	  }

	  return copyCollection(target, customizer);
	}

	function copyCollection(target, customizer) {
	  if (typeof customizer !== 'function') {
	    throw new TypeError('customizer is must be a Function');
	  }

	  if (typeof target === 'function') {
	    var source = String(target);

	    // NOTE:
	    //
	    //   https://gist.github.com/jdalton/5e34d890105aca44399f
	    //
	    //   - https://gist.github.com/jdalton/5e34d890105aca44399f#gistcomment-1283831
	    //   - http://es5.github.io/#x15
	    //
	    //   native functions does not have prototype:
	    //
	    //       Object.toString.prototype  // => undefined
	    //       (function() {}).prototype  // => {}
	    //
	    //   but cannot detect native constructor:
	    //
	    //       typeof Object     // => 'function'
	    //       Object.prototype  // => {}
	    //
	    //   and cannot detect null binded function:
	    //
	    //       String(Math.abs)
	    //         // => 'function abs() { [native code] }'
	    //
	    //     Firefox, Safari:
	    //       String((function abs() {}).bind(null))
	    //         // => 'function abs() { [native code] }'
	    //
	    //     Chrome:
	    //       String((function abs() {}).bind(null))
	    //         // => 'function () { [native code] }'
	    if (/^\s*function\s*\S*\([^\)]*\)\s*{\s*\[native code\]\s*}/.test(source)) {
	      // native function
	      return target;
	    } else {
	      // user defined function
	      return new Function('return ' + String(source))();
	    }
	  }

	  var targetClass = toString.call(target);

	  if (targetClass === '[object Array]') {
	    return [];
	  }

	  if (targetClass === '[object Object]' && target.constructor === Object) {
	    return {};
	  }

	  if (targetClass === '[object Date]') {
	    // NOTE:
	    //
	    //   Firefox need to convert
	    //
	    //   Firefox:
	    //     var date = new Date;
	    //     +date;            // 1420909365967
	    //     +new Date(date);  // 1420909365000
	    //     +new Date(+date); // 1420909365967
	    //
	    //   Chrome:
	    //     var date = new Date;
	    //     +date;            // 1420909757913
	    //     +new Date(date);  // 1420909757913
	    //     +new Date(+date); // 1420909757913
	    return new Date(target.getTime());
	  }

	  if (targetClass === '[object RegExp]') {
	    // NOTE:
	    //
	    //   Chrome, Safari:
	    //     (new RegExp).source => "(?:)"
	    //
	    //   Firefox:
	    //     (new RegExp).source => ""
	    //
	    //   Chrome, Safari, Firefox:
	    //     String(new RegExp) => "/(?:)/"
	    var regexpText = String(target),
	        slashIndex = regexpText.lastIndexOf('/');

	    return new RegExp(regexpText.slice(1, slashIndex), regexpText.slice(slashIndex + 1));
	  }

	  if ((0, _polyfill.isBuffer)(target)) {
	    var buffer = new Buffer(target.length);

	    target.copy(buffer);

	    return buffer;
	  }

	  var customizerResult = customizer(target);

	  if (customizerResult !== void 0) {
	    return customizerResult;
	  }

	  return null;
	}

	function copyValue(target) {
	  var targetType = typeof target;

	  // copy String, Number, Boolean, undefined and Symbol
	  // without null and Function
	  if (target !== null && targetType !== 'object' && targetType !== 'function') {
	    return target;
	  }

	  return null;
	}

	exports.copy = copy;
	exports.copyCollection = copyCollection;
	exports.copyValue = copyValue;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(35).Buffer))

/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	exports.__esModule = true;
	var toString = Object.prototype.toString;

	var isBuffer = typeof Buffer !== 'undefined' ? function isBuffer(obj) {
	  return Buffer.isBuffer(obj);
	} : function isBuffer() {
	  // always return false in browsers
	  return false;
	};

	var getKeys = typeof Object.keys === 'function' ? function getKeys(obj) {
	  return Object.keys(obj);
	} : function getKeys(obj) {
	  var objType = typeof obj;

	  if (obj === null || objType !== 'function' && objType !== 'object') {
	    throw new TypeError('obj must be an Object');
	  }

	  var resultKeys = [],
	      key = void 0;

	  for (key in obj) {
	    Object.prototype.hasOwnProperty.call(obj, key) && resultKeys.push(key);
	  }

	  return resultKeys;
	};

	var getSymbols = typeof Symbol === 'function' ? function getSymbols(obj) {
	  return Object.getOwnPropertySymbols(obj);
	} : function getSymbols() {
	  // always return empty Array when Symbol is not supported
	  return [];
	};

	// NOTE:
	//
	//   Array.prototype.indexOf is cannot find NaN (in Chrome)
	//   Array.prototype.includes is can find NaN (in Chrome)
	//
	//   this function can find NaN, because use SameValue algorithm
	function indexOf(array, s) {
	  if (toString.call(array) !== '[object Array]') {
	    throw new TypeError('array must be an Array');
	  }

	  var i = void 0,
	      len = void 0,
	      value = void 0;

	  for (i = 0, len = array.length; i < len; ++i) {
	    value = array[i];

	    // NOTE:
	    //
	    //   it is SameValue algorithm
	    //   http://stackoverflow.com/questions/27144277/comparing-a-variable-with-itself
	    //
	    // eslint-disable-next-line no-self-compare
	    if (value === s || value !== value && s !== s) {
	      return i;
	    }
	  }

	  return -1;
	}

	exports.getKeys = getKeys;
	exports.getSymbols = getSymbols;
	exports.indexOf = indexOf;
	exports.isBuffer = isBuffer;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(35).Buffer))

/***/ }
/******/ ])
});
;