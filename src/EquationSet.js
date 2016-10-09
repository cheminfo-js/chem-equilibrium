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
        return this.getSpecies();
    }

    getSpecies(species, type) {
        var speciesSet = new Set();
        for(var [key, eq] of this.entries()) {
            if(this._disabledKeys.has(key)) continue;
            if(type && type !== eq.type) continue;
            if(species) {
                if(species.indexOf(eq.formed) > -1) {
                    speciesSet.add(eq.formed);
                    Object.keys(eq.components).forEach(c => speciesSet.add(c));
                } else {
                    Object.keys(eq.components).forEach(c => {
                        if(species.indexOf(c) > -1) speciesSet.add(c);
                    });
                }
            } else {
                speciesSet.add(eq.formed);
                Object.keys(eq.components).forEach(c => speciesSet.add(c));
            }
        }
        return Array.from(speciesSet);
    }


    get components() {
        return this.getComponents();
    }

    getComponents(species, type) {
        if(!this.isNormalized()) {
            throw new Error('Cannot get components from non-normalized equation set')
        }
        var speciesSet = new Set();
        for(var [key, eq] of this.entries()) {
            if(this._disabledKeys.has(key)) continue;
            if (type && type !== eq.type) continue;
            if (species) {
                if (species.indexOf(eq.formed) > -1) {
                    Object.keys(eq.components).forEach(c => speciesSet.add(c));
                } else {
                    Object.keys(eq.components).forEach(c => {
                        if(species.indexOf(c) > -1) speciesSet.add(c);
                    });
                }
            } else {
                Object.keys(eq.components).forEach(c => speciesSet.add(c));
            }

        }
        return Array.from(speciesSet);
    }

    disableEquation(key, hashIt) {
        key = hashIt ? getHash(key) : key;
        this._disabledKeys.add(key);
    }

    enableEquation(key, hashIt) {
        key = hashIt ? getHash(key) : key;
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

    values() {
        return this.equations.values();
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

    getEquations() {
        return Array.from(this.equations)
            .filter(e => !this._disabledKeys.has(e[0]))
            .map(e => e[1].toJSON());
    }

    getModel(totals, all) {
        if (!this.isNormalized()) {
            throw new Error('Cannot get model from un-normalized equation set');
        }
        var totalComp = {};
        if(all) {
            var subset = this;
        } else {
            subset = this.getSubset(Object.keys(totals));
        }
        var components = subset.components;
        const subsetKeys = [...subset.keys()];
        const subsetArr = [...subset.values()]
            .filter((s, idx) => !this._disabledKeys.has(subsetKeys[idx]));
        components.forEach(c => totalComp[c] = 0);
        for(var key in totals) {
            if(totals.hasOwnProperty(key)) {
                var total = totals[key] || 0;
                if(components.indexOf(key) !== -1) {
                    totalComp[key] += total;
                } else {
                    var eq = subsetArr.find(eq => {
                        return eq.formed === key
                    });
                    if(eq) {
                        var keys = Object.keys(eq.components);
                        for(var i=0; i<keys.length; i++) {
                            totalComp[keys[i]] += eq.components[keys[i]] * total;
                        }
                    }
                }
            }
        }

        var model =  {
            volume: 1
        };

        model.components = components.map(key => {
            return {
                label: key,
                total: totalComp[key]
            }
        });

        model.formedSpecies = subsetArr.map(eq => {
            return {
                solid: eq.type === 'precipitation',
                label: eq.formed,
                beta: eq.type === 'precipitation' ? Math.pow(10, -eq.pK) : Math.pow(10, eq.pK),
                components: components.map(key => {
                    return eq.components[key] || 0
                })
            }
        });

        return model;
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
        var passes = 0;
        while(passes <= 10 && moreAdded) {
            passes++;
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

        if(passes === 10) {
            throw new Error('You might have a circular dependency in your equations');
        }

        // Pass along some properties
        newSet._disabledKeys = new Set(this._disabledKeys);
        newSet._normalized = this._normalized;
        return newSet;
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
    for (let j = 0; j < keys.length; j++) {
        var key = keys[j];
        let nn = n * components[key];
        var rep = equations.find(eq => eq.formed === keys[j]);
        if (!rep) {
            componentsToFill[keys[j]] = componentsToFill[keys[j]] || 0;
            componentsToFill[keys[j]] += nn;
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