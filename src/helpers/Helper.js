import database from '../../data/data.json';
import { EquationSet } from "../core/EquationSet";
import { Equilibrium } from "../core/Equilibrium";

const deepcopy = require('deepcopy');

const defaultOptions = {
  solvent: 'H2O',
};

export class Helper {
  constructor(options) {
    this.atEquilibrium = new Set();
    options = { ...defaultOptions, ...options };
    let db = options.database || database;
    if (options.extend && options.database) db = db.concat(database);
    db = processDB(db, options);
    this.species = {};
    this.options = options;
    this.eqSet = new EquationSet(db);
    this.addSpecie(options.solvent);
  }

  // Clone
  clone() {
    let helper = new Helper();
    helper.species = deepcopy(this.species);
    helper.eqSet = this.eqSet.clone();
    helper.options = deepcopy(this.options);
    helper.atEquilibrium = new Set(this.atEquilibrium);
    return helper;
  }

  // =========== Getters ==============

  getSpecies(options) {
    options = options || {};
    let species = options.filtered ? Object.keys(this.species) : null;
    let getOptions = { ...options };
    getOptions.species = species;
    return this.eqSet.getSpecies(getOptions);
  }

  getComponents(options) {
    options = options || {};
    let species = options.filtered ? Object.keys(this.species) : null;
    if (species) var eqSet = this.eqSet.getSubset(species);
    else eqSet = this.eqSet;
    return eqSet.getNormalized(this.options.solvent).getComponents(options);
  }

  getEquations(options) {
    options = options || {};
    let eqSet = this.eqSet;
    if (options.filtered) {
      eqSet = this.eqSet.getSubset(Object.keys(this.species));
    }
    if (options.normalized) {
      eqSet = eqSet.getNormalized(this.options.solvent);
    }
    return eqSet.getEquations(options);
  }

  getModel() {
    let subSet = this.eqSet.getSubset(Object.keys(this.species));
    let normSet = subSet.getNormalized(this.options.solvent);
    let model = normSet.getModel(this.species, true);
    model.components.forEach((c) => {
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
    this.options = { ...this.options, ...options };
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

function processDB(db, options) {
  db = deepcopy(db);
  let toRemove = [];
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
