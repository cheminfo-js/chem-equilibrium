'use strict';
var Matrix = require('ml-matrix');

function newtonRaphton(model, beta, cTotal, c) {

    var ncomp = cTotal.length;
    var nspec = beta.length;

    if (c.length !== ncomp || model.length !== ncomp || model[0].length !== nspec) {
        throw new Error('Invalid arguments');
    }

    model = new Matrix(model);

    // Prevent numerical difficulties
    for (var i = 0; i < cTotal.length; i++) {
        if (cTotal[i] === 0) cTotal = 1e-15;
    }

    c = new Matrix([c]);

    var maxIt = 99;
    for (i = 0; i < maxIt; i++) {
        var cSpec = Matrix.multiply(prod(pow(c.transpose().repeat(1, nspec), model)), [beta]);
        // console.log('cSpec', cSpec);
        var cTotCalc = sumColumns(Matrix.multiply(cSpec.repeat(ncomp, 1), model)).transpose();
        // console.log('cTotCalc', cTotCalc);

        // console.log(cTotal, cTotCalc);
        var d = Matrix.subtract([cTotal], cTotCalc);

        // console.log('d', d);
        if (checkEpsilon(d[0])) return cSpec.to1DArray();


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
        var deltaC = d.mmul(Jstar.inverse()).mmul(Matrix.diag(c[0]));
        // console.log('deltaC', deltaC);
        c.add(deltaC);
        // console.log('c', c);
        while (checkNeg(c[0])) {
            deltaC = deltaC.multiply(0.5);
            c.subtract(deltaC);
            if (checkEpsilon(deltaC)) break;
        }

    }

    if(i >= maxIt) {
        return null;
    }
    return cSpec.to1DArray();

}

module.exports = newtonRaphton;

function checkEpsilon(arr) {
    return !arr.some(function (el) {
        return Math.abs(el) > 1e-15
    });
}

function checkNeg(arr) {
    return arr.some(function (el) {
        return el <= 0;
    });
}

function prod(matrix) {
    var res = new Matrix(1, matrix.columns).fill(1);
    for (var i = 0; i < matrix.rows; i++) {
        for (var j = 0; j < matrix.columns; j++) {
            res[0][j] *= matrix[i][j];
        }
    }
    return res;
}

function sumColumns(matrix) {
    var res = new Matrix(matrix.rows, 1).fill(0);
    for (var i = 0; i < matrix.rows; i++) {
        for (var j = 0; j < matrix.columns; j++) {
            res[i][0] += matrix[i][j];
        }
    }
    return res;
}

function sumRows(matrix) {
    var res = new Matrix(1, matrix.columns).fill(0);
    for (var i = 0; i < matrix.rows; i++) {
        for (var j = 0; j < matrix.columns; j++) {
            res[0][j] += matrix[i][j];
        }
    }
    return res;
}


function pow(matrix1, matrix2) {
    for (var i = 0; i < matrix1.rows; i++) {
        for (var j = 0; j < matrix1.columns; j++) {
            matrix1[i][j] = Math.pow(matrix1[i][j], matrix2[i][j]);
        }
    }
    return matrix1;
}