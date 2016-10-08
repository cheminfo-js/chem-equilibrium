'use strict';

const equations1 = [
    {
        formed: 'A',
        components: {
            B: -1
        },
        type: 'acidoBasic',
        pK: 1
    },
    {
        formed: 'C',
        components: {
            D: 2,
            E: 1
        },
        type: 'precipitation',
        pK: 1
    }
];

const equations2 = [
    {
        formed: 'A',
        components: {
            B: 2
        },
        type: 'acidoBasic',
        pK: 2
    },
    {
        formed: 'B',
        components: {
            C: 1,
            D: 1
        },
        type: 'acidoBasic',
        pK: 3
    }
];

const equations3 = [
    {
        formed: 'A',
        components: {
            B: 1,
            C: 1
        },
        pK: -2,
        type: 'acidoBasic'
    },
    {
        formed: 'B',
        components: {
            D: 1
        },
        pK: 3,
        type: 'acidoBasic'
    }
];

const equations4 = equations2.slice();
equations4.push({
    formed: 'X',
    components: {
        Y: 1
    },
    pK: 1,
    type: 'acidoBasic'
});

const circularEquations = [
    {
        formed: 'A',
        components: {
            B: 1
        },
        pK:1, type: 'acidoBasic'
    },
    {
        formed: 'B',
        components: {
            A:1,
            C:1
        },
        pK:1, type: 'acidoBasic'
    }
];


module.exports = {
    equations1,
    equations2,
    equations3,
    equations4,
    circularEquations
};