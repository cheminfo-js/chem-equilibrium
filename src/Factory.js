'use strict';

const chemistEquations = require('../data/data.json');
var equations = processChemist(chemistEquations);
const allComponents = getComponentList(equations);
const Equilibrium = require('./Equilibrium');
const defaultOptions = {
    solvent: 'H2O'
};

class Factory {
    constructor(options) {
        options = Object.assign({}, defaultOptions, options);
        this.components = [];
        this.options = {};
        this._hasChanged = true;
        this._setSolvent(options.solvent);
    }

    static getSpecieLabels(type) {
        var labels = new Set();
        var keys = Object.keys(equations);
        for(var i=0; i<keys.length; i++) {
            var eq = equations[keys[i]];
            if(!type || eq.type === type) {
                labels.add(keys[i]);
                for(let key in eq.components) {
                    labels.add(key);
                }
            }
        }
        return Array.from(labels);
    }


    _setSolvent(solvent) {
        this.solvent = solvent;
        this._solventEquations();
        // de facto add components linked to solvent
        this.addSpecie(this.solvent);
    }

    addSpecie(label, total) {
        if(label === this.solvent) {
            total = 0;
        }
        var eq = this.solventEquations[label] || equations[label];
        if (eq) {
            for (var key in eq.components) {
                this._addComponent(key, total * eq.components[key]);
            }
        } else if (allComponents.indexOf(label) >= 0) {
            this._addComponent(label, total);
        } else if(label !== this.solvent){
            throw new Error('Specie not found');
        }
    }

    _addComponent(label, total) {
        if (!total) total = 0;
        var comp = this.components.find(c => c.label === label);
        if (comp) comp.total += total;
        else {
            this._hasChanged = true;
            this.components.push({
                label, total
            });
        }
    }

    _solventEquations() {
        var solvent = {};
        var keys = Object.keys(equations);
        for(var i=0; i<keys.length; i++) {
            var key = keys[i];

            var comp = equations[key].components;
            var compKeys = Object.keys(comp);
            if(key === this.solvent) {
                solvent[key] = {
                    formed: compKeys[compKeys.length-1],
                    components: {},
                    pK: -equations[key].pK
                };
                for(let j=0; j<compKeys.length-1; j++) {
                    let compKey = compKeys[j];
                    solvent[key].components[compKey] = -equations[key].components[compKey];
                }
                // check for repercussions on other equations
                replaceComponent(key, solvent);
                // alias
                solvent[solvent[key].formed] = solvent[key];

            } else {
                for(let j=0; j<compKeys.length; j++) {
                    let compKey = compKeys[i];
                    if(equations[key].components[compKey] === this.solvent) {
                        solvent[key] = {
                            components: Object.assign(equations[key].components),
                            pK: equations[key].pK
                        };
                        // Remove solvent from equation
                        delete solvent[key].components[compKey];
                    }
                }
            }

        }
        this.solventEquations = solvent;
        return solvent;
    }

    setTotal(componentLabel, total) {
        var c = this.components.find(c => c.label === componentLabel);
        c.total = total;
        c.atEquilibrium = undefined;
    }

    setAtEquilibrium(componentLabel, atEquilibrium) {
        var c = this.components.find(c => c.label === componentLabel);
        c.atEquilibrium = atEquilibrium;
        c.total = undefined;
    }

    setOptions(options) {
        this.options = options;
    }

    getEquilibrium() {
        return new Equilibrium(this.getModel(), this.options);
    }

    getComponents() {
        return this.components;
    }

    getEquations(type) {
        var that = this;
        type = type || 'chemist';
        this._getEquations();
        var result = [];
        function addEquations(eq, solid) {
            var keys = Object.keys(eq);
            for(var i=0; i<keys.length; i++) {
                var key = keys[i];
                var label, currentEq;
                if(type === 'decomposed') {
                    label = key;
                    currentEq = equations[key];
                } else if(type === 'decomposed-solvent') {
                    label = that.solventEquations[key] && that.solventEquations[key].formed || key;
                    currentEq = that.solventEquations[key] || eq[key];
                } else if(type === 'chemist') {
                    label = key;
                    currentEq = chemistEquations[key];
                }
                result.push({
                    label: label,
                    components: []
                });
                var idx = result.length - 1;
                if(solid) result[idx].solid = true;

                var ks = Object.keys(currentEq.components);
                for(var j=0; j<ks.length; j++) {
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
        var that = this;
        var nbComponents = this.components.length;
        var model = {};

        this._getEquations();
        var equations = this._equations;
        var solidEquations = this._solidEquations;

        function addEquations(equations, modelEq, solid) {
            var keys = Object.keys(equations);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var equation = equations[key];
                var eq = {
                    label: that.solventEquations[key] && that.solventEquations[key].formed || key,
                    beta: Math.pow(10, equation.pK),
                    components: new Array(that.components.length).fill(0)
                };
                if (solid) eq.solid = true;
                modelEq.push(eq);
                var comp = equation.components;
                var compKeys = Object.keys(comp);
                for (var j = 0; j < compKeys.length; j++) {
                    var idx = that.components.findIndex(c => c.label === compKeys[j]);
                    eq.components[idx] += comp[compKeys[j]];
                }
            }
        }


        model.formedSpecies = [];
        addEquations(equations, model.formedSpecies);
        addEquations(solidEquations, model.formedSpecies, true);



        // Model components
        model.components = new Array(nbComponents);
        for (var i = 0; i < this.components.length; i++) {
            model.components[i] = Object.assign({}, this.components[i]);
        }

        return model;
    }

    reset() {
        for (var i = 0; i < this.components.length; i++) {
            this.components[i].total = 0;
            this.components[i].atEquilibrium = undefined;
        }
    }

    _getEquations() {
        if (!this._hasChanged) {
            // Optimization: if involved components did not change, don't find equations again
            return;
        }
        this._equations = {};
        this._solidEquations = {};
        // Traverse all equations and find those that involve all components
        // of the current model
        var keys = Object.keys(equations);
        loop1: for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var eq = this.solventEquations[key] || equations[key];
            var productLabel = eq.formed || key;
            //if(eq.formed) key = eq.formed;
            let compKeys = Object.keys(eq.components);
            for (var j = 0; j < compKeys.length; j++) {
                if (!this.components.find(c => c.label === compKeys[j])) {
                    continue loop1;
                }
            }
            if (eq.type === 'precipitation') {
                this._solidEquations[key] = eq;
            } else {
                this._equations[key] = eq;
            }
        }
        this._hasChanged = false;
    }
}

module.exports = Factory;

function getComponentList(equations) {
    var list = new Set();
    for (var key in equations) {
        var eq = equations[key];
        if (eq.components) {
            var keys = Object.keys(eq.components);
            for (var i = 0; i < keys.length; i++) {
                list.add(keys[i]);
            }
        }
    }
    return Array.from(list);
}

function processChemist(eq) {
    var equations = {};
    var links = {};
    // we add the children
    for (var key in eq) {
        if(eq.hasOwnProperty(key)) {
            var e = eq[key];
            if(e.type === 'acidoBasic') {
                links[key] = {
                    child: {
                        entity: Object.keys(e.components)[0],
                        pk: e.pK
                    }
                }
            } else {
                equations[key] = eq[key];
            }
        }
    }

    // Process acido-basic reactions
    for (key in links) {
        var current = links[key];
        var pk = current.child.pk;
        var number = 1;
        var childEntity = current.child.entity;
        while (links[childEntity]) {
            number++;
            pk += links[childEntity].child.pk;
            childEntity = links[childEntity].child.entity;
        }
        current.deprotonated = {
            label: childEntity,
            protons: number,
            pk: pk
        };
        equations[key] = {
            pK: pk,
            components: {
                'H+': number,
                [childEntity]: 1
            },
            type: eq[key].type
        }
    }

    return equations;
}

function replaceComponent(key, eq) {
    var formed = eq[key].formed;
    if(!formed) return;
    var keys = Object.keys(equations);
    for(var i=0; i<keys.length; i++) {
        if(keys[i] === key) continue;
        var compKeys = Object.keys(equations[keys[i]].components);
        for(var j=0; j<compKeys.length; j++) {
            var compKey = compKeys[j];
            if(compKey === formed) {
                var newEq = eq[keys[i]] = eq[keys[i]] || {formed:keys[i], pK: equations[keys[i]].pK, components: Object.assign({}, equations[keys[i]].components)};
                var n = equations[keys[i]].components[compKey];
                for(var k in eq[key].components) {
                    if(newEq.components[k]) {
                        newEq.components[k] += n * eq[key].components[k];
                    } else {
                        newEq.components[k] = n * eq[key].components[k];
                    }
                }
                delete newEq.components[formed];
            }
        }
    }
}