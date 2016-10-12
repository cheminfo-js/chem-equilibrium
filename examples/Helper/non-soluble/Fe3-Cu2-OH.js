'use strict';

const Helper = require('../../../src/Helper');

var chunks = 10;

for(var i=0; i<= chunks; i++) {
    var h = new Helper();
    h.addSpecie('Cu++', 0.01);
    h.addSpecie('Fe+++', 0.01);
    h.addSpecie('OH-', i/chunks * 0.05);
    var result = h.getEquilibrium().solveRobust();
    console.log(result['OH-'] - result['H+'] + 2 * result['Cu(OH)2'] + 3 * result['Fe(OH)3'] + 4*result['Cu(OH)4--']);
    console.log('Ksp Cu(OH)2', result['Cu++'] * Math.pow(result['H+'], -2));
    console.log('Ksp Fe(OH)3', result['Fe+++'] * Math.pow(result['H+'],-3));
    console.log('Precipitate Cu(OH)2', result['Cu(OH)2']);
    console.log('Precipitate Fe(OH)3', result['Fe(OH)3']);
}
console.log(JSON.stringify(h.getModel(), null, '\t'));