'use strict';

const superagent = require('superagent');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

superagent.get('https://googledocs.cheminfo.org/spreadsheets/d/1VjfiuDtJUqxdfyFr7DdVcIM-l3eh47SqanafHdbXvDQ/export?format=tsv').then(function (res) {
    var parsed = Papa.parse(res.text, {
        header: true,
        delimiter: '\t',
        dynamicTyping: true
    });
    var data = parsed.data;
    data = data.filter(d => d.Active !== 'no');
    data.forEach(function (d) {
        var reg = /\s*(\d*)\s*(.*)/;
        var m = reg.exec(d.A);
        d.sA = m[2];
        d.nA = m[1] || 1;
        m = reg.exec(d.B);
        d.sB = m[2];
        d.nB = m[1] || 1;
        m = reg.exec(d.AB);
        d.sAB = m[2];
        d.nAB = m[1] || 1;
        d.nA /= d.nAB;
        d.nB /= d.nAB;
        d.nAB = 1;
    });

    var acidity = data.filter(function (d) {
        return d.type === 'acidity' && d.B === 'H+' && d.pk !== undefined;
    });
    var complex = data.filter(function(d) {
        return d.type.match(/complex/i) && d.pk !== undefined;
    });
    var precipitation = data.filter(function(d) {
        return d.type === 'precipitation' && d.pk !== undefined;
    });
    var equations = Object.assign(getEquations(acidity, 'acidoBasic'), getEquations(complex, 'complexation'), getEquations(precipitation, 'precipitation'));
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(equations));
}).catch(function (err) {
    console.log(err);
    process.exit(1);
});

function getEquations(eq, type) {
    var equations = {};
    for(var s of eq) {
        equations[s.AB] = {
            components: {
                [s.sA]: s.nA,
                [s.sB]: s.nB
            },
            pK: s.pk,
            type: type
        }
    }
    return equations;
}

function getEquationsPrecipitation(precipitation) {
    var equations = {};
    for(var s of precipitation) {
        equations[s.AB] = {
            components: {
                [s.sA]: s.nA,
                [s.sB]: s.nB
            },
            pK: s.pk,
            type: 'precipitation'
        }
    }
    return equations;
}

function getEquationsComplexation(complex) {
    var equations = {};
    for(var s of complex) {
        equations[s.AB] = {
            components: {
                [s.sA]: s.nA,
                [s.sB]: s.nB
            },
            pK: s.pk,
            type: 'complexation'
        }
    }
    return equations;
}

function getEquationsAcidity(reactions) {
    var components = new Set();
    var equations = {};
    var links = {};
    // we add the children
    for (var line of reactions) {
        links[line.AB] = {
            child: {
                entity: line.A,
                pk: line.pk
            }
        }
    }

    for (var key in links) {
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
        }
    }
    // we give the species and number of times it is there

    reactions.forEach(function (reaction) {
        reaction.protons = links[reaction.AB].deprotonated.protons;
        reaction.pka = reaction.pk;
        reaction.deprotonated = links[reaction.AB].deprotonated.label;
        reaction.totalPk = links[reaction.AB].deprotonated.pk;
        reaction.totalPka = reaction.totalPk;
    });

    for (var key in links) {
        equations[key] = {
            components: {
                'H+' : links[key].deprotonated.protons,
                [links[key].deprotonated.label]: 1
            },
            pK: links[key].deprotonated.pk,
            type: 'acidoBasic'
        }
    }

    return equations;
}