'use strict';

const multiSolvent = [
    {
        formed: 'A',
        components: {
            B: 1,
            C: 2
        },
        type: 'acidoBasic',
        pK: 1
    },
    {
        formed: 'D',
        components: {
            E: 1,
            F: 2
        },
        type: 'acidoBasic',
        pK: {
            H2O: 4,
            DMSO: 3
        }
    },
    {
        formed: 'G',
        components: {
            H: 1,
            I: 2
        },
        type: 'acidoBasic',
        pK: {
            DMSO: 3
        }
    },
];

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

const AgClInDMSO = [
    {
        formed: 'AgCl',
        components: {
            'Ag+': 1,
            'Cl-': 1
        },
        pK: {DMSO: 9.74},
        type: 'precipitation'
    },
    {
        formed: 'AgCl2-',
        components: {
            'Ag+': 1,
            'Cl-': 2
        },
        pK: {DMSO: 5.26},
        type: 'complexation'
    }
];

const acidBase = [
    {
        "formed": "CH3CO2H",
        "components": {
            "CH3COO-": 1,
            "H+": 1
        },
        "pK": 4.7,
        "type": "acidoBasic"
    },
    {
        "formed": "HCO3-",
        "components": {
            "CO3--": 1,
            "H+": 1
        },
        "pK": 10.33,
        "type": "acidoBasic"
    },
    {
        "formed": "H2CO3",
        "components": {
            "HCO3-": 1,
            "H+": 1
        },
        "pK": 6.3,
        "type": "acidoBasic"
    },
    {
        "formed": "H2O",
        "components": {
            "OH-": 1,
            "H+": 1
        },
        "pK": 14,
        "type": "acidoBasic"
    },
    {
        "formed": "HPO4--",
        "components": {
            "PO4---": 1,
            "H+": 1
        },
        "pK": 12.32,
        "type": "acidoBasic"
    },
    {
        "formed": "H3PO4",
        "components": {
            "H2PO4-": 1,
            "H+": 1
        },
        "pK": 2.12,
        "type": "acidoBasic"
    },
    {
        "formed": "H2PO4-",
        "components": {
            "HPO4--": 1,
            "H+": 1
        },
        "pK": 7.2,
        "type": "acidoBasic"
    }
];

const AgInWater = [
    {
        "formed": "AgOH",
        "components": {
            "Ag+": 1,
            "OH-": 1
        },
        "pK": 7.72,
        "type": "precipitation"
    },
    {
        "formed": "H2O",
        "components": {
            "OH-": 1,
            "H+": 1
        },
        "pK": 14,
        "type": "acidoBasic"
    }
];


module.exports = {
    equations1,
    equations2,
    equations3,
    equations4,
    circularEquations,
    multiSolvent,
    AgClInDMSO,
    acidBase,
    AgInWater
};