'use strict';

const Equation = require('./Equation');
class EquationSet {
    constructor(equations) {
        equations = equations || [];
        this._normalized = false;
        this._disabledKeys = new Set();
        this.equations = new Map();
        for (var i = 0; i < equations.length; i++) {
            this.add(equations[i]);
        }
    }

    [Symbol.iterator]() {
        return this.equations.values();
    }

    add(eq, key) {
        var equation = Equation.create(eq);
        key = key || getHash(eq.formed);
        this.equations.set(key, equation);
        this._normalized = false;
    }

    has(eq) {
        if(eq instanceof Equation) {
            var key = getHash(eq.formed);
        } else {
            key = eq;
        }
        return this.equations.has(key);
    }

    get species() {
        var speciesSet = new Set();
        this.forEach(eq => {
            speciesSet.add(eq.formed);
            Object.keys(eq.components).forEach(c => speciesSet.add(c));
        });
        return Array.from(speciesSet);
    }

    get components() {
        var speciesSet = new Set();
        this.forEach(eq => {
            Object.keys(eq.components).forEach(c => speciesSet.add(c));
        });
        return Array.from(speciesSet);
    }

    disableEquation(key) {
        this._disabledKeys.add(key);
    }

    enableEquation(key) {
        this._disabledKeys.delete(key);
    }

    get size() {
        return this.equations.size;
    }

    get(id, hashIt) {
        var key;
        if(hashIt) {
            key = getHash(id);
        } else {
            key = id;
        }
        return this.equations.get(key);
    }

    keys() {
        return this.equations.keys();
    }

    entries() {
        return this.equations.entries();
    }

    forEach() {
        return this.equations.forEach.apply(this.equations, arguments);
    }


    getNormalized(solvent) {
        // In a normalized set, formed species can be found in any of the components
        // of the equation set
        var norm = new Array(this.equations.size);
        var keys = new Array(this.equations.size);
        var idx = 0;
        for (const [key, entry] of this.entries()) {
            norm[idx] = entry.withSolvent(solvent);
            keys[idx] = key;
            idx++;
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

    isNormalized() {
        return this._normalized;
    }

    getModel() {
        if (!this.isNormalized()) {
            throw new Error('Cannot get model from un-normalized equation set');
        }
    }

    getSubset(species) {
        var speciesSet = new Set();
        species.forEach(s => speciesSet.add(s));
        // get a subset of the equations given a set of species
        var newSet = new EquationSet();
        this.forEach(function(eq) {
            if(species.indexOf(eq.formed) !== -1) {
                newSet.add(eq);
                speciesSet.add(eq.formed);
                Object.keys(eq.components).forEach(s => speciesSet.add(s));
            }
        });

        var moreAdded = true;
        while(moreAdded) {
            moreAdded = false;
            this.forEach(function(eq) {
                var hasAll = !Object.keys(eq.components).some(c => !speciesSet.has(c));
                if(hasAll && !newSet.has(eq)) {
                    newSet.add(eq);
                    speciesSet.add(eq.formed);
                    moreAdded = true;
                }
            });
        }

        // Pass along some properties
        newSet._disabledKeys = new Set(this._disabledKeys);
        newSet._normalized = this._normalized;
        return newSet;
    }

    getEquationById() {

    }
}

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
        throw new Error('something went wrong');
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
            return !arr[idx];
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
    for (let j = 0; j < keys.length; j++) {
        var key = keys[j];
        let nn = n * components[key];
        var rep = equations.find(eq => eq.formed === keys[j]);
        if (!rep) {
            componentsToFill[keys[j]] = componentsToFill[keys[j]] || 0;
            componentsToFill[keys[j]] += nn * eq.components[keys[j]];
        } else {
            fillRec(equations, rep, eqToFill, nn);
        }
    }
    eqToFill.pK = eqToFill.pK || 0;
    eqToFill.pK += n * eq.pK;
}

function getHash(id) {
    return new Buffer(id).toString('base64');
}