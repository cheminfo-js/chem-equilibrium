'use strict';

const equations = require('../data/data.json');
const allComponents = getComponentList(equations);
const Equilibrium = require('./Equilibrium');

class Helper {
    constructor() {
        this.components = [];
        this.options = {};
        this._hasChanged = true;
    }

    addSpecie(label, total) {
        var eq = equations[label];
        if (eq) {
            for (var key in eq.components) {
                this._addComponent(key, total * eq.components[key]);
            }
        } else if (allComponents.indexOf(label) >= 0 || label === 'OH-') {
            this._addComponent(label, total);
        } else {
            throw new Error('Specie not found');
        }
    }

    _addComponent(label, total) {
        if (label === 'OH-') {
            label = 'H+';
            total = -total;
        }
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

    ignoreEquation(label) {
        // Update equations
        this._getEquations();
        delete this._equations[label];
        delete this._solidEquations[label];

        // TODO: check if it disrupted the model
        // is disrupted if a component does not appear in any equation
    }

    getModel() {
        var that = this;
        var nbComponents = this.components.length;

        var protonIndex = this.components.findIndex(c => c.label === 'H+');

        var model = {};

        this._getEquations();
        var {_equations: equations, _solidEquations: solidEquations} = this;

        function addEquations(equations, modelEq, solid) {
            var keys = Object.keys(equations);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var equation = equations[key];
                var eq = {
                    label: keys[i],
                    beta: Math.pow(10, equation.pK),
                    components: new Array(that.components.length).fill(0),
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


        if (protonIndex >= 0) {
            model.formedSpecies.push({
                label: 'OH-',
                beta: Math.pow(10, -14),
                components: new Array(this.components.length).fill(0)
            });
            model.formedSpecies[model.formedSpecies.length - 1].components[protonIndex] = -1;
        }


        // Model components
        model.components = new Array(nbComponents);
        for (var i = 0; i < this.components.length; i++) {
            model.components[i] = Object.assign({}, this.components[i]);
        }
        //
        // // Model formed species
        // model.formedSpecies = [{
        //     label: 'OH-',
        //     beta: Math.pow(10, -14),
        //     components: new Array(nbComponents).fill(0)
        // }];
        //
        // model.formedSpecies[0].components[protonIndex] = -1;
        //
        //
        // for (var i = 0; i < this.components.length; i++) {
        //     if (i === protonIndex) continue;
        //     var group = groupedAcidBase[this.components[i].label];
        //     if (group) {
        //         for (var j = 0; j < group.length; j++) {
        //             var el = group[j];
        //             model.formedSpecies.push({
        //                 label: String(el.AB),
        //                 beta: Math.pow(10, Number(el.totalPka)),
        //                 components: new Array(nbComponents).fill(0)
        //             });
        //             model.formedSpecies[model.formedSpecies.length - 1].components[i] = 1;
        //             model.formedSpecies[model.formedSpecies.length - 1].components[protonIndex] = Number(el.protons);
        //         }
        //     } else {
        //         console.warn('doing nothing with component');
        //     }
        // }

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
            var eq = equations[key];
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

module.exports = Helper;

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