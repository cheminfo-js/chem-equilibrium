'use strict';
var Matrix = require('ml-matrix');
var stat = require('ml-stat').matrix;

function newtonRaphton(model, beta, cTotal, c) {
    // c is component concentrations
    // model contains stoechiometric coefficient of the reactions
    // beta is the equilibrium constant for each reaction
    // cTotal is the total concentration of each component
    var ncomp = cTotal.length;
    var nspec = beta.length;

    // Sanity check
    if (c.length !== ncomp || model.length !== ncomp || model[0].length !== nspec) {
        throw new Error('Invalid arguments');
    }

    model = new Matrix(model);

    // Prevent numerical difficulties
    for (var i = 0; i < cTotal.length; i++) {
        if (cTotal[i] === 0) cTotal[i] = 1e-15;
    }

    c = new Matrix([c]);

    var maxIt = 99;
    for (i = 0; i < maxIt; i++) {
        // Calculate all species concentrations from component concentrations
        var cSpec = Matrix.multiply([stat.product(c.transpose().repeat(1, nspec).pow(model), 0)], [beta]);
        // console.log('cSpec', cSpec);
        // Compute total concentration of each component
        var cTotCalc = new Matrix([stat.sum(Matrix.multiply(cSpec.repeat(ncomp, 1), model), 1)]);
        // console.log('cTotCalc', cTotCalc);

        // console.log(cTotal, cTotCalc);
        // d is the difference between expected total concentration and actual total concentration given
        var d = Matrix.subtract([cTotal], cTotCalc);

        // console.log('d', d);
        if (checkEpsilon(d[0])) {
            return cSpec.to1DArray();
        }


        // We decompose the Jacobian (Jstar is symetric and easier to inverse)
        var Jstar = new Matrix(ncomp, ncomp).fill(0);

        for (var j = 0; j < ncomp; j++) {
            for (var k = j; k < ncomp; k++) {
                for (var l = 0; l < nspec; l++) {
                    Jstar[j][k] += model[k][l] * model[j][l] * cSpec[0][l];
                    Jstar[k][j] = Jstar[j][k];
                }
            }
        }


        // console.log('jstar', Jstar);
        // console.log('inter', d, d.mmul(Jstar.inv()));
        // We compute the next delta of component concentrations and apply it to the current component concentrations
        var deltaC = d.mmul(Jstar.inverse()).mmul(Matrix.diag(c[0]));
        // console.log('deltaC', deltaC);
        c.add(deltaC);
        // console.log('c', c);
        // c should be positive. If it's not we want to subtract some of the deltaC we've added
        // We do this iteratively until either nothing is negative anymore or deltaC has become very small
        while (checkNeg(c[0])) {
            deltaC = deltaC.multiply(0.5);
            c.subtract(deltaC);
            if (checkEpsilon(deltaC[0])) break;
        }

    }

    if(i >= maxIt) {
        return null;
    }
    return cSpec.to1DArray();

}

module.exports = newtonRaphton;

// Returns true if all elements in the array are smaller than 1e-15
function checkEpsilon(arr) {
    return !arr.some(function (el) {
        return Math.abs(el) >= 1e-15
    });
}

// return true if any element is negative
function checkNeg(arr) {
    return arr.some(function (el) {
        return el <= 0;
    });
}
