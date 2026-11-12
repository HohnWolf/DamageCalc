'use strict';
// Local entry. Does not load the Showdown server or lib/index (no network, no SQL).
const { Battle } = require('./sim/battle');
const { Teams } = require('./sim/teams');
const { TeamValidator } = require('./sim/team-validator');
const { Dex, toID } = require('./sim/dex');
const { PRNG } = require('./sim/prng');
module.exports = { Battle, Teams, TeamValidator, Dex, toID, PRNG };
