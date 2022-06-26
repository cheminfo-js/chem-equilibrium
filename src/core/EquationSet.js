import { Equation } from './Equation';

export class EquationSet {
  constructor(equations) {
    equations = equations || [];
    this._normalized = false;
    this._disabledKeys = new Set();
    this._equations = new Map();
    for (let i = 0; i < equations.length; i++) {
      this.add(equations[i]);
    }
  }

  [Symbol.iterator]() {
    return this._equations.values();
  }

  clone() {
    let eqSet = new EquationSet();
    eqSet._normalized = this._normalized;
    eqSet._disabledKeys = this._disabledKeys;
    for (const [key, eq] of this.entries()) {
      eqSet._equations.set(key, eq.clone());
    }
    return eqSet;
  }

  add(eq, key) {
    let equation = Equation.create(eq);
    key = key || getHash(eq.formed);
    this._equations.set(key, equation);
    this._normalized = false;
  }

  has(eq) {
    if (eq instanceof Equation) {
      var key = getHash(eq.formed);
    } else {
      key = eq;
    }
    return this._equations.has(key);
  }

  get species() {
    return this.getSpecies();
  }

  getSpecies(options) {
    options = { ...options };
    let species = options.species;
    let type = options.type;
    let includeDisabled = options.includeDisabled;
    let speciesSet = new Set();

    if (species) {
      let subset = this.getSubset(species);
      delete options.species;
      return subset.getSpecies(options);
    } else {
      for (let [key, eq] of this.entries()) {
        if (this._disabledKeys.has(key) && !includeDisabled) continue;
        if (type && type !== eq.type) continue;
        speciesSet.add(eq.formed);
        Object.keys(eq.components).forEach((c) => speciesSet.add(c));
      }
    }
    return Array.from(speciesSet);
  }

  get components() {
    return this.getComponents();
  }

  getComponents(options) {
    options = options || {};
    let species = options.species;
    let type = options.type;
    let includeDisabled = options.includeDisabled;
    if (!this.isNormalized()) {
      throw new Error('Cannot get components from non-normalized equation set');
    }
    let speciesSet = new Set();
    for (let [key, eq] of this.entries()) {
      if (this._disabledKeys.has(key) && !includeDisabled) continue;
      if (type && type !== eq.type) continue;
      if (species) {
        if (species.indexOf(eq.formed) > -1) {
          Object.keys(eq.components).forEach((c) => speciesSet.add(c));
        } else {
          Object.keys(eq.components).forEach((c) => {
            if (species.indexOf(c) > -1) speciesSet.add(c);
          });
        }
      } else {
        Object.keys(eq.components).forEach((c) => speciesSet.add(c));
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

  enableAllEquations() {
    this._disabledKeys.clear();
  }

  get size() {
    return this._equations.size;
  }

  get(id, hashIt) {
    let key;
    if (hashIt) {
      key = getHash(id);
    } else {
      key = id;
    }
    return this._equations.get(key);
  }

  keys() {
    return this._equations.keys();
  }

  values() {
    return this._equations.values();
  }

  entries() {
    return this._equations.entries();
  }

  forEach() {
    return this._equations.forEach.apply(this._equations, arguments);
  }

  getNormalized(solvent) {
    // In a normalized set, formed species can be found in any of the components
    // of the equation set
    let norm = new Array(this._equations.size);
    let keys = new Array(this._equations.size);
    let idx = 0;
    for (const [key, entry] of this.entries()) {
      norm[idx] = entry.withSolvent(solvent);
      keys[idx] = key;
      idx++;
    }
    norm = normalize(norm);

    let normSet = new EquationSet();
    for (let i = 0; i < norm.length; i++) {
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

  getEquations(options) {
    options = options || {};
    return Array.from(this._equations)
      .filter((e) => options.includeDisabled || !this._disabledKeys.has(e[0]))
      .map((e) => {
        let r = e[1].toJSON();
        if (this._disabledKeys.has(e[0])) r.disabled = true;
        return r;
      });
  }

  getModel(totals, all) {
    if (!this.isNormalized()) {
      throw new Error('Cannot get model from un-normalized equation set');
    }
    let totalComp = {};
    if (all) {
      var subset = this;
    } else {
      subset = this.getSubset(Object.keys(totals));
    }
    let components = subset.components;
    const subsetKeys = [...subset.keys()];
    const subsetArr = [...subset.values()].filter(
      (s, idx) => !this._disabledKeys.has(subsetKeys[idx]),
    );
    components.forEach((c) => (totalComp[c] = 0));
    for (var key in totals) {
      let total = totals[key] || 0;
      if (components.indexOf(key) !== -1) {
        totalComp[key] += total;
      } else {
        let eq = subsetArr.find((eq) => {
          return eq.formed === key;
        });
        if (eq) {
          let keys = Object.keys(eq.components);
          for (let i = 0; i < keys.length; i++) {
            totalComp[keys[i]] += eq.components[keys[i]] * total;
          }
        }
      }
    }

    let model = {
      volume: 1,
    };

    model.components = components.map((key) => {
      return {
        label: key,
        total: totalComp[key],
      };
    });

    model.formedSpecies = subsetArr.map((eq) => {
      return {
        solid: eq.type === 'precipitation',
        label: eq.formed,
        beta: Math.pow(10, eq.pK),
        components: components.map((key) => {
          return eq.components[key] || 0;
        }),
      };
    });

    return model;
  }

  getSubset(species) {
    let speciesSet = new Set(species);
    // get a subset of the equations given a set of species
    let newSet = new EquationSet();
    let moreAdded = true;
    let passes = 0;

    var f = (species) => {
      passes++;
      if (passes === 10) return;
      this.forEach(function (eq) {
        if (species.includes(eq.formed) && !newSet.has(eq)) {
          newSet.add(eq);
          speciesSet.add(eq.formed);
          let newComponents = Object.keys(eq.components);
          newComponents.forEach((s) => speciesSet.add(s));
          f(newComponents);
        }
      });
    };

    f(species);

    if (passes === 10) {
      throw new Error('You might have a circular dependency in your equations');
    }

    moreAdded = true;
    passes = 0;
    while (passes <= 10 && moreAdded) {
      passes++;
      moreAdded = false;
      this.forEach(function (eq) {
        let hasAll = Object.keys(eq.components).every((c) => speciesSet.has(c));
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
}

function normalize(equations) {
  let N = equations.length;
  let newEquations = new Array(N).fill(0);
  let needs = new Array(N);

  // First, find the independent equations
  for (let i = 0; i < N; i++) {
    if (isIndependent(equations, i)) {
      newEquations[i] = equations[i];
    } else {
      let keys = Object.keys(equations[i].components);
      needs[i] = keys.map(function (key) {
        return equations.findIndex(function (eq) {
          return eq.formed === key;
        });
      });
    }
  }

  let iter = 0;
  while (!allDefined(newEquations) && iter < 10) {
    for (let i = 0; i < N; i++) {
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
  let keys = Object.keys(equations[idx].components);
  for (let i = 0; i < keys.length; i++) {
    var key = keys[i];
    let eq = equations.find(function (eq) {
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
  let eq = equations[i];
  let newEq = {
    type: eq.type,
    formed: eq.formed,
    components: {},
  };
  fillRec(equations, eq, newEq, 1);
  newEquations[i] = newEq;
}

function fillRec(equations, eq, eqToFill, n) {
  let componentsToFill = eqToFill.components;
  let components = eq.components;
  let keys = Object.keys(components);
  for (let j = 0; j < keys.length; j++) {
    let key = keys[j];
    let nn = n * components[key];
    let rep = equations.find((eq) => eq.formed === keys[j]);
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
