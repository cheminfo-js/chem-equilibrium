'use strict';
const database = require('../../data/data.json');
const EquationSet = require('./../core/EquationSet');
const deepcopy = require('deepcopy');
const Equilibrium = require('./../core/Equilibrium');

const defaultOptions = {
    solvent: 'H2O'
};

class Helper {
    constructor(options) {
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

    // Clone
    clone() {
        var helper = new Helper();
        helper.species = deepcopy(this.species);
        helper.eqSet = this.eqSet.clone();
        helper.options = deepcopy(this.options);
        helper.atEquilibrium = new Set(this.atEquilibrium);
        return helper;
    }

    // =========== Getters ==============

    getSpecies(options) {
        options = options || {};
        var species = options.filtered ? Object.keys(this.species) : null;
        var getOptions = Object.assign({}, options);
        getOptions.species = species;
        return this.eqSet.getSpecies(getOptions);
    }


    getComponents(options) {
        options = options || {};
        var species = options.filtered ? Object.keys(this.species) : null;
        if (species) var eqSet = this.eqSet.getSubset(species);
        else eqSet = this.eqSet;
        return eqSet.getNormalized(this.options.solvent).getComponents(options);
    }

    getEquations(options) {
        options = options || {};
        var eqSet = this.eqSet;
        if (options.filtered) {
            eqSet = this.eqSet.getSubset(Object.keys(this.species));
        }
        if (options.normalized) {
            eqSet = eqSet.getNormalized(this.options.solvent);
        }
        return eqSet.getEquations(options);
    }


    getModel() {
        var subSet = this.eqSet.getSubset(Object.keys(this.species));
        var normSet = subSet.getNormalized(this.options.solvent);
        var model = normSet.getModel(this.species, true);
        model.components.forEach(c => {
            if (this.atEquilibrium.has(c.label)) {
                c.atEquilibrium = this.species[c.label];
                delete c.total;
            }
        });
        return model;
    }

    getEquilibrium() {
        return new Equilibrium(this.getModel(), this.options);
    }

    // =========== Setters ==============

    addSpecie(label, total) {
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

    resetSpecies() {
        this.species = {};
        this.addSpecie(this.options.solvent);
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
        this.options = Object.assign({}, this.options, options);
    }


    disableEquation(formedSpecie) {
        this.eqSet.disableEquation(formedSpecie, true);
    }

    enableEquation(formedSpecie) {
        this.eqSet.enableEquation(formedSpecie, true);
    }

    enableAllEquations() {
        this.eqSet.enableAllEquations();
    }

}

module.exports = Helper;

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
