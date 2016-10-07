'use strict';
const database = require('../data/data.json');
const EquationSet = require('./EquationSet');

const defaultOptions = {
    solvent: 'H2O'
};

class Factory {
    constructor(options) {
        this.atEquilibrium = new Set();
        options = Object.assign({}, defaultOptions, options);
        this.species = {};
        this.options = options;
        this.eqSet = new EquationSet(options.database || database);
        this.addSpecie(options.solvent);
    }

    static getSpecieLabels(type) {
        return eqSet.species;
    }


    addSpecie(label, total) {
        total = total || 0;
        if (label === this.solvent) {
            total = 0;
        }
        if(!this.species[label]) {
            this.species[label] = total;
        } else {
            this.species[label] += total;
        }
    }

    setTotal(label, total) {
        this.species[label] = total;
        this.atEquilibrium.delete(label);
    }

    setAtEquilibrium(componentLabel, atEquilibrium) {
        this.species[label] = total;
        this.atEquilibrium.add(label);
    }

    setOptions(options) {
        this.options = options;
    }

    getEquilibrium() {
        return new Equilibrium(this.getModel(), this.options);
    }

    getEquations(type) {
        var that = this;
        type = type || 'chemist';
        this._getEquations();
        var result = [];

        function addEquations(eq, solid) {
            var keys = Object.keys(eq);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var label, currentEq;
                if (type === 'decomposed') {
                    label = key;
                    currentEq = equations[key];
                } else if (type === 'decomposed-solvent') {
                    label = that.solventEquations[key] && that.solventEquations[key].formed || key;
                    currentEq = that.solventEquations[key] || eq[key];
                } else if (type === 'chemist') {
                    label = key;
                    currentEq = chemistEquations[key];
                }
                result.push({
                    label: label,
                    components: []
                });
                var idx = result.length - 1;
                if (solid) result[idx].solid = true;

                var ks = Object.keys(currentEq.components);
                for (var j = 0; j < ks.length; j++) {
                    var k = ks[j];
                    result[idx].components.push({
                        label: ks[j],
                        n: currentEq.components[k]
                    });
                }
            }
        }

        addEquations(this._equations);
        addEquations(this._solidEquations, true);
        return result;
    }

    getModel() {
        var subSet = this.eqSet.getSubset(Object.keys(this.species));
        var normSet = subSet.getNormalized(this.options.solvent);
        return normSet.getModel(this.species, true);
    }

}

module.exports = Factory;

