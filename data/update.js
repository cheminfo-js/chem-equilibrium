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
        d.sA = m[2].trim();
        d.nA = m[1] || 1;
        m = reg.exec(d.B);
        d.sB = m[2].trim();
        d.nB = m[1] || 1;
        m = reg.exec(d.AB);
        d.sAB = m[2].trim();
        d.nAB = m[1] || 1;
        d.nA /= d.nAB;
        d.nB /= d.nAB;
        d.nAB = 1;
    });

    data = processData(data);
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, '\t'));
}).catch(function (err) {
    console.log(err);
    process.exit(1);
});

function processData(data) {
    return data.map(d => {
        var type = d.type.match(/complex/i) ? 'complexation' : d.type;
        if(d.nAB !== 1) throw new Error('Product cannot have a stoechiometric coefficient');
        return {
            formed: d.AB,
            components: {
                [d.sA]: d.nA,
                [d.sB]: d.nB
            },
            pK: d.pk,
            type: type
        }
    });
}
