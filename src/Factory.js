'use strict';
const database = require('../data/data.json');
const EquationSet = require('./EquationSet');
const deepcopy = require('deepcopy');

const defaultOptions = {
    solvent: 'H2O'
};

class Factory {
    constructor(options) {
        this.atEquilibrium = new Set();
        options = Object.assign({}, defaultOptions, options);
        var db = options.database || database;
        db = processDB(db, options);
        this.species = {};
        this.options = options;
        this.eqSet = new EquationSet(db);
        this.addSpecie(options.solvent);
    }

    getSpecies(filtered, type) {
        var species = filtered ? Object.keys(this.species) : null;
        return this.eqSet.getSpecies(species, type);
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

    getComponents(filtered, type) {
        var species = filtered ? Object.keys(this.species) : null;
        return this.eqSet.getComponents(species, type);
    }

    setTotal(label, total) {
        this.species[label] = total;
        this.atEquilibrium.delete(label);
    }

    setAtEquilibrium(label, value) {
        this.species[label] = value;
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
        var model = normSet.getModel(this.species, true);
        model.components.forEach(c => {
            if(this.atEquilibrium.has(c.label)) {
                c.atEquilibrium = this.species[c.label];
                delete c.total;
            }
        });
        return model;
    }

}

module.exports = Factory;

function processDB(db, options) {
    db = deepcopy(db);
    var toRemove = [];
    for(var i=0; i<db.length; i++) {
        if(typeof db[i].pK !== 'number' || options.solvent !== 'H2O') {
            if(!db[i].pK[options.solvent]) {
                toRemove.push(i);
            } else {
                db[i].pK = db[i].pK[options.solvent];
            }
        }
    }

    for(i = db.length -1; i >= 0; i--) {
        if(toRemove.indexOf(i) > -1) {
            db.splice(i, 1);
        }
    }

    return db;
}
