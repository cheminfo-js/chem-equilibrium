'use strict';

const deepcopy = require('deepcopy');
const types = ['acidoBasic', 'precipitation', 'complexation'];
class Equation {
  constructor(eq) {
    // Sanity checks
    if (typeof eq.formed !== 'string')
      throw new Error('equation expects a property "formed" that is a string');
    if (typeof eq.pK !== 'number')
      throw new Error('equation expects a property "pK" that is a number');
    if (types.indexOf(eq.type) === -1) throw new Error('Unexpected type');
    if (Object.prototype.toString.call(eq.components) !== '[object Object]')
      throw new Error('Unexpected components');
    if (Object.keys(eq.components).length < 1)
      throw new Error('Components is expected to have at least one key');

    this._eq = deepcopy(eq);
  }

  static create(eq) {
    if (eq instanceof Equation) {
      return eq.clone();
    } else {
      return new Equation(eq);
    }
  }

  get pK() {
    return this._eq.pK;
  }

  get formed() {
    return this._eq.formed;
  }

  get components() {
    return this._eq.components;
  }

  get type() {
    return this._eq.type;
  }

  clone() {
    return new Equation(deepcopy(this._eq));
  }

  toJSON() {
    return this._eq;
  }

  // Get a new representation of the equation given a solvent
  // Returns a new equation that does not include the solvent
  withSolvent(solvent) {
    var eq = {};
    var comp = this._eq.components;
    var formed = this._eq.formed;
    var compKeys = Object.keys(comp);
    if (formed === solvent) {
      eq.formed = compKeys[0];
      eq.components = {};
      eq.pK = -this._eq.pK;
      eq.type = this._eq.type;
      for (let j = 1; j < compKeys.length; j++) {
        let compKey = compKeys[j];
        eq.components[compKey] = -this._eq.components[compKey];
      }
    } else {
      for (let j = 0; j < compKeys.length; j++) {
        let compKey = compKeys[j];
        if (compKey === solvent) {
          eq = deepcopy(this._eq);
          // Remove solvent from equation
          delete eq.components[compKey];
          break;
        }
      }
    }
    if (!eq.components) {
      return this.clone();
    }

    return new Equation(eq);
  }
}

module.exports = Equation;
