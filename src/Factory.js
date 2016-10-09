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
        if(options.extend && options.database) db = db.concat(database);
        db = processDB(db, options);
        this.species = {};
        this.options = options;
        this.eqSet = new EquationSet(db);
        this.addSpecie(options.solvent);
    }

    getSpecies(filtered, type) {
        var species = filtered ? Object.keys(this.species).concat(this.options.solvent) : null;
        return this.eqSet.getSpecies(species, type);
    }

    disableEquation(formedSpecie) {
        this.eqSet.disableEquation(formedSpecie, true);
    }

    enableEquation(formedSpecie) {
        this.eqSet.enableEquation(formedSpecie, true);
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
        var species = filtered ? Object.keys(this.species).concat(this.options.solvent) : null;
        return this.eqSet.getNormalized(this.options.solvent).getComponents(species, type);
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

    getEquations(filtered, normalized) {
        var eqSet = this.eqSet;
        if(filtered) {
            eqSet = this.eqSet.getSubset(Object.keys(this.species));
        }
        if(normalized) {
            eqSet = eqSet.getNormalized(this.options.solvent);
        }
        return eqSet.getEquations();
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
