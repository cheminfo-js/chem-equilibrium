'use strict';
var Matrix = require('ml-matrix');
var stat = require('ml-stat').matrix;

function newtonRaphton(model, beta, cTotal, c, solidModel, solidBeta, solidC) {
    // c is component concentrations. The initialization is up to the caller
    // model contains stoechiometric coefficient of the reactions
    // beta is the equilibrium constant for each reaction
    // cTotal is the total concentration of each component
    // solid model contains stoechiometric coefficients of the precipitation reactions
    // solidBeta contains the solubility constants
    // solidC contains the initial solid species "concentrations"
    var ncomp = cTotal.length;
    var nspec = beta.length;

    if (!solidModel) solidModel = new Array(ncomp).fill(0).map(() => []);
    if (!solidBeta) solidBeta = [];
    if (!solidC) solidC = [];

    var nsolid = solidBeta.length;

    // Sanity check
    if (c.length !== ncomp || model.length !== ncomp || model[0].length !== nspec || solidC.length !== nsolid || solidModel.length !== ncomp || solidModel[0] && solidModel[0].length !== nsolid) {
        throw new Error('Invalid arguments');
    }

    model = new Matrix(model);
    if (nsolid) {
        solidModel = new Matrix(solidModel);
        var lnSolidBeta = new Matrix([solidBeta.map(Math.log2)]);
        solidC = new Matrix([solidC]);
    }
    // Prevent numerical difficulties
    for (var i = 0; i < cTotal.length; i++) {
        if (cTotal[i] === 0) cTotal[i] = 1e-15;
    }

    c = new Matrix([c]);


    var maxIt = 99;
    for (i = 0; i < maxIt; i++) {
        // console.log('iteration' , i);
        // console.log(c, solidC)

        // First we determine which solids are not completely dissolved and need to be included in newton
        // For this we compute the solubility products and compare it to the equilibrium constants
        var solidIndices = [];
        if (nsolid) {
            var Ksp = stat.product(c.transpose().repeat(1, nsolid).pow(solidModel), 0);
            Ksp.forEach((k, idx) => {
                if (k > solidBeta[idx]) {
                    // The computed solubility product is greater than maximum value
                    solidIndices.push(idx);
                } else if (solidC[0][idx] > 0) {
                    // solid concentration is not 0
                    solidIndices.push(idx);
                } else if (Math.abs(k - solidBeta[idx]) < 1e-15) {
                    // diff is negative but small, we keep it in the model
                    solidIndices.push(idx);
                }
            });
            //solidIndices = getRange(0, solidC[0].length -1);
            var lnKsp = Ksp.slice();
            for (j = 0; j < lnKsp.length; j++) {
                lnKsp[j] = Math.log2(lnKsp[j]);
            }
        }

        // console.log(solidIndices);
        var nSolidPicked = solidIndices.length;
        if (nSolidPicked) {
            var solidCPicked = solidC.selection([0], solidIndices);
            var solidModelPicked = solidModel.selection(getRange(0, ncomp - 1), solidIndices);
        }

        var njstar = ncomp + nSolidPicked;


        // Calculate all species concentrations from component concentrations
        // console.log('c', c.to1DArray());
        var cSpec = Matrix.multiply([stat.product(c.transpose().repeat(1, nspec).pow(model), 0)], [beta]);
        // console.log('cSpec', cSpec);
        // Compute total concentration of each component based on dissolved species
        var cTotCalc = new Matrix([stat.sum(Matrix.multiply(cSpec.repeat(ncomp, 1), model), 1)]);

        // console.log('number of solids', nSolidPicked);
        // Add to it "concentrations" based on solid species
        if (nsolid)
            cTotCalc.add([stat.sum(Matrix.multiply(solidC.repeat(ncomp, 1), solidModel), 1)]);

        // console.log(cTotal, cTotCalc);
        // d is the difference between expected total concentration and actual total concentration given
        // console.log('cTotCalc', cTotCalc.to1DArray());
        var d = Matrix.subtract([cTotal], cTotCalc);
        if (nSolidPicked) {
            var dK = Matrix.subtract(lnSolidBeta, [lnKsp]).selection([0], solidIndices);
            var dkOrig = Matrix.subtract([solidBeta], [Ksp]).selection([0], solidIndices);
            var dAll = new Matrix(1, njstar);
            dAll.setSubMatrix(d, 0, 0);
            dAll.setSubMatrix(dK, 0, ncomp);
        } else {
            dAll = d;
        }

        // console.log('diff solution', d.to1DArray());
        if (nsolid) {
            // console.log('solidC', solidC.to1DArray());
            // console.log('picked ids', solidIndices);
        }

        // console.log('dkorig', dkOrig);
        if (checkEpsilon(d[0]) && checkSolid(solidC, dkOrig)) {
            // console.log('final solution concentrations',c);
            // console.log('final solid concentrations', solidC);
            console.log(`solution converged in ${i} iterations`);
            return cSpec.to1DArray().concat(solidC.to1DArray ? solidC.to1DArray() : solidC);
        }


        // We decompose the Jacobian (Jstar is symetric and easier to inverse)
        var Jstar = new Matrix(njstar, njstar).fill(0);

        // Fill the part of Jstar specific to dissolved variables
        for (var j = 0; j < ncomp; j++) {
            for (var k = j; k < ncomp; k++) {
                for (var l = 0; l < nspec; l++) {
                    Jstar[j][k] += model[k][l] * model[j][l] * cSpec[0][l];
                    Jstar[k][j] = Jstar[j][k];
                }
            }
        }

        // Fill the part of jstar specific to solid part
        for (j = 0; j < ncomp; j++) {
            for (k = 0; k < nSolidPicked; k++) {
                var jk = k + ncomp;
                Jstar[j][jk] = solidModelPicked[j][k];
                Jstar[jk][j] = solidModelPicked[j][k];
            }
        }


        // console.log('jstar', Jstar);
        // console.log('inter', d, d.mmul(Jstar.inv()));
        // We compute the next delta of component concentrations and apply it to the current component concentrations
        var diag = Matrix.identity(njstar).setSubMatrix(Matrix.diag(c[0]), 0, 0);
        var deltaC = dAll.mmul(Jstar.inverse()).mmul(diag);

        var allC = new Matrix(1, njstar);
        allC.setSubMatrix(c, 0, 0);
        if (nSolidPicked) {
            allC.setSubMatrix(solidCPicked, 0, ncomp);
        }
        // console.log('deltaC', deltaC);
        allC.add(deltaC);
        // console.log('c', c);
        // c should be positive. If it's not we want to subtract some of the deltaC we've added
        // We do this iteratively until either nothing is negative anymore or deltaC has become very small
        while (checkNeg(allC[0])) {
            deltaC = deltaC.multiply(0.5);
            allC.subtract(deltaC);
            if (checkEpsilon(deltaC[0])) break;
        }

        // console.log('allC', allC.to1DArray());

        for (j = 0; j < c.columns; j++) {
            c.set(0, j, allC.get(0, j));
        }
        for (j = 0; j < nSolidPicked; j++) {
            var val = allC.get(0, ncomp + j);
            if (val < 0) solidC.set(0, solidIndices[j], 0);
            else solidC.set(0, solidIndices[j], val);
        }
    }

    if (i >= maxIt) {
        console.log('did not converge')
        return null;
    }
    // console.log('insoluble indices', solidIndices);
    return cSpec.to1DArray().concat(solidC.to1DArray ? solidC.to1DArray() : solidC);

}

module.exports = newtonRaphton;

// Returns true if all elements in the array are smaller than 1e-15
function checkEpsilon(arr, n) {
    return !arr.some(function (el, idx) {
        if (n && idx >= n) return false;
        return Math.abs(el) >= 1e-15
    });
}

function checkSolid(c, dk) {
    if (!c.length) return true;
    return !c[0].some(function (value, idx) {
        return value !== 0 && Math.abs(dk[idx]) >= 1e-15;
    });
}

// return true if any element is negative
function checkNeg(arr, n) {
    return arr.some(function (el, idx) {
        if (n && idx >= n) return true;
        return el <= 0;
    });
}

function checkAllNeg(arr) {
    return !arr.some(function (el) {
        return el > 0;
    })
}

function getRange(start, end) {
    var arr = [];
    for (var i = start; i <= end; i++) {
        arr.push(i);
    }
    return arr;
}