'use strict';

const superagent = require('superagent');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

superagent.get('https://googledocs.cheminfo.org/spreadsheets/d/1VjfiuDtJUqxdfyFr7DdVcIM-l3eh47SqanafHdbXvDQ/export?format=tsv').then(function(res) {
    var parsed = Papa.parse(res.text, {
        header: true,
        delimiter: '\t',
        dynamicTyping: true
    });
    var data = parsed.data;
    var acidity = data.filter(function(d) {
        return d.type === 'acidity' && d.B === 'H+' && d.pk !== undefined;
    });
    appendSpecies(acidity);
    console.log(data)
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data));
}).catch(function(err) {
    console.log(err);
});


function appendSpecies(pkas) {
    var links={};
    debugger;
    // we add the children
    for (var line of pkas) {
        links[line.AB] = {
            child: {
                entity:line.A,
                pk:line.pk
            }
        }
    }

    for (var key in links) {
        var current=links[key];
        var pk=current.child.pk;
        var number=1;
        var childEntity=current.child.entity;
        while (links[childEntity]) {
            number++;
            pk+=links[childEntity].child.pk;
            childEntity=links[childEntity].child.entity;
        }
        current.deprotonated={
            label:childEntity,
            protons: number,
            pk: pk
        }
    }
    // we give the species and number of times it is there

    pkas.forEach(function(pka) {
        pka.deprotonated=links[pka.AB].deprotonated
    });

    return links;
}