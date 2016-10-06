'use strict';

const Equation = require('./Equation');
class EquationSet {
    constructor(equations) {
        equations = equations || [];
        this._changed = false;
        this.equations = new Map();
        for (var i = 0; i < equations.length; i++) {
            this.addEquation(equations[i]);
        }

    }

    [Symbol.iterator]() {
        return this.equations.values();
    }

    addEquation(eq, key) {
        var equation = Equation.create(eq);
        var key = key || new Buffer(equation.formed).toString('base64');
        if (this.equations.get(key)) {
            throw new Error('Could not add equation, another equation with the same key already exists');
        }
        this.equations.set(key, equation);
        this._changed = true;
    }

    disableEquation(eq) {

    }

    enableEquation(eq) {

    }

    get(id) {
        return this.equations.get(id);
    }

    keys() {
        return this.equations.keys();
    }

    entries() {
        return this.equations.entries();
    }


    getNormalized(solvent) {
        var norm = new Array(this.equations.size);
        var keys = new Array(this.equations.size);
        var idx = 0;
        for (const [key, entry] of this.entries()) {
            console.log(key, entry);
            norm[idx] = entry.withSolvent(solvent);
            keys[idx] = key;
            idx++;
        }
        norm = normalize(norm);

        var normSet = new EquationSet();
        for (var i = 0; i < norm.length; i++) {
            normSet.addEquation(norm[i], keys[i]);
        }

        // return a new equation set that has been normalized
        // normalization requires the solvent to be set
        return normSet;
    }

    isNormalized() {
        // check normalization
        // An equation set is normalized when no formed species can be found in any of the components
        // of the equation set

    }

    getModel() {
        if (!this.isNormalized()) {
            throw new Error('Cannot get model from un-normalized equation set');
        }
    }

    getSubset(species) {
        // get a subset of the equations given a set of species

    }

    getEquationById() {

    }
}

module.exports = EquationSet;

function normalize(equations) {
    var N = equations.length;
    var newEquations = new Array(N);
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
    while (iter < 10) {
        for (var i = 0; i < N; i++) {
            if (!newEquations[i]) {
                if (allDefined(newEquations, needs[i])) {
                    fillLine(equations, newEquations, i);
                }
            }
        }
        iter++;
    }
    return newEquations;
}

function isIndependent(equations, idx) {
    console.log(equations, equations.length)
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
    return !idx.any(function (idx) {
        return arr[idx];
    });
}

function fillLine() {
    return {};
}