'use strict';

const Equilibrium = require('./core/Equilibrium');
const Helper = require('./helpers/Helper');
const Serie = require('./helpers/Serie');

Equilibrium.Helper = Helper;
Equilibrium.Serie = Serie;

module.exports = Equilibrium;