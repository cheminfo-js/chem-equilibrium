'use strict';

const reactions = require('../data/data.json');
const groupBy = require('lodash.groupby');

var groupedAcidBase = groupBy(reactions.filter(r => r.type === 'acidity'), reaction => {
    return reaction.deprotonated;
});

class Helper {
    constructor() {
        this.components = [];
    }

    static getAllAcidBaseLabels() {
        var species = new Set();
        for (var i = 0; i < reactions.length; i++) {
            species.add(reactions[i].ha);
            species.add(reactions[i].a);
        }
        return Array.from(species);
    }

    addAcidBase(label, total) {
        var protons;
        var reaction = reactions.find(function (reaction) {
            return reaction.AB === label
        });
        if (reaction) {
            protons = reaction.protons;
        } else {
            reaction = reactions.find(function (reaction) {
                return reaction.A === label;
            });
            if (reaction) protons = 0;
            else {
                if (label === 'OH-') {
                    this.addComponent('OH-', total);
                    return;
                } else {
                    throw new Error('Could not find acid/base');
                }
            }
        }

        this.addComponent(reaction.deprotonated, total);
        this.addComponent('H+', protons * total);
    }

    addComponent(label, total) {
        if (label === 'OH-') {
            label = 'H+';
            total = -total;
        }
        if (!total) total = 0;
        var comp = this.components.find(c => c.label === label);
        if (comp) comp.total += total;
        else {
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

    getModel() {
        var nbComponents = this.components.length;

        var protonIndex = this.components.findIndex(c => c.label === 'H+');
        if (protonIndex === -1) throw new Error('Acid-base model has no proton');

        var model = {};

        // Model components
        model.components = new Array(nbComponents);
        for (i = 0; i < this.components.length; i++) {
            model.components[i] = Object.assign({}, this.components[i]);
        }

        // Model formed species
        model.formedSpecies = [{
            label: 'OH-',
            beta: Math.pow(10, -14),
            components: new Array(nbComponents).fill(0)
        }];

        model.formedSpecies[0].components[protonIndex] = -1;


        for (var i = 0; i < this.components.length; i++) {
            if (i === protonIndex) continue;
            var group = groupedAcidBase[this.components[i].label];
            if(group) {
                for (var j = 0; j < group.length; j++) {
                    var el = group[j];
                    model.formedSpecies.push({
                        label: String(el.AB),
                        beta: Math.pow(10, Number(el.totalPka)),
                        components: new Array(nbComponents).fill(0)
                    });
                    model.formedSpecies[model.formedSpecies.length - 1].components[i] = 1;
                    model.formedSpecies[model.formedSpecies.length - 1].components[protonIndex] = Number(el.protons);
                }
            } else {
                console.warn('doing nothing with component');
            }
        }

        return model;
    }
}

module.exports = Helper;