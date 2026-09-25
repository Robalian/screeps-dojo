'use strict';

// PC1 spawns itself, walks to the controller and enables the room; Placed
// sits pre-spawned in OPERATE_* range of the spawn and tower. See main.js for
// the bot and power-creeps.json for the roster (both creeps sum to gpl 8).
//
// PWR_OPERATE_TOWER and PWR_SHIELD are POWER_INFO ids from @screeps/common's
// constants.js (3 and 12) — the bot's own VM has these as globals
// (PWR_OPERATE_TOWER, PWR_SHIELD, ...), but scenario.js runs on the host
// side, outside that sandbox, so they are repeated here as literals.
const PWR_OPERATE_TOWER = 3;
const PWR_SHIELD = 12;

const fs = require('fs');
const path = require('path');

// Tracked across ticks by until() below, because the effects this scenario
// checks for are transient (PWR_OPERATE_TOWER's 100-tick duration and
// SHIELD's 50-tick rampart can both fade before maxTicks) — final state alone
// would miss them, so every tick is watched as it happens instead.
let pc1SpawnedTick = null;
let sawPowerEnabled = false;
let sawTowerEffect = false;
let sawShieldRampart = false;
let ticksSeen = 0;

// state.objects is the raw rooms.objects doc, and an effects array that has
// been through the mock DB's bulk update can come back as an index-keyed
// object ({"0": {...}}) rather than a real array — the same quirk the README
// documents for the bot-facing side. Object.values() normalizes either shape.
function effectsOf(object) {
	if (!object || !object.effects) return [];
	return Array.isArray(object.effects) ? object.effects : Object.values(object.effects);
}

module.exports = {
	modules: {
		main: fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
	},
	maxTicks: 120,
	setup: async function (world) {
		// map.W0N0.json carries an owner:'me' spawn, so it is adopted as the
		// bot's home; power-creeps.json (PC1 unspawned, Placed's powers) is
		// attached by the runner before setup() runs.
		await world.loadAllMaps();
	},
	until: function (state) {
		ticksSeen++;
		if (pc1SpawnedTick === null && state.powerCreeps.PC1) pc1SpawnedTick = ticksSeen;

		const controller = state.objects.find(function (o) { return o.type === 'controller'; });
		if (controller && controller.isPowerEnabled) sawPowerEnabled = true;

		const tower = state.objects.find(function (o) { return o.type === 'tower'; });
		if (tower && effectsOf(tower).some(function (e) {
			return e.power === PWR_OPERATE_TOWER && e.endTime > state.gameTime;
		})) sawTowerEffect = true;

		if (state.objects.some(function (o) {
			return o.type === 'rampart' && effectsOf(o).some(function (e) { return e.power === PWR_SHIELD; });
		})) sawShieldRampart = true;

		// Never stop early: run the full 120 ticks so every effect above has a
		// chance to appear (and the replay shows the whole sequence).
		return false;
	},
	expect: function (result, assert) {
		const botErrors = result.console.filter(function (line) { return line.indexOf('⚠ bot error:') === 0; });
		assert.strictEqual(botErrors.length, 0, 'no bot errors, got: ' + JSON.stringify(botErrors));

		assert.ok(pc1SpawnedTick !== null && pc1SpawnedTick <= 5,
			'PC1 should be spawned (present in state.powerCreeps) by tick 5, '
			+ (pc1SpawnedTick === null ? 'never spawned' : 'first seen at tick ' + pc1SpawnedTick));

		assert.ok(sawPowerEnabled, 'the controller should become isPowerEnabled');
		assert.ok(sawTowerEffect, 'the tower should carry an active PWR_OPERATE_TOWER effect at some tick');
		assert.ok(sawShieldRampart, 'a SHIELD rampart should appear');
	}
};
