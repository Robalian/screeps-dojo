'use strict';

// PC1: unspawned in the roster. Spawns itself at the power spawn, walks to the
// controller, enables the room, then generates ops and shields itself once.
// Placed: already spawned on the map, standing within OPERATE_* range (3) of
// both the spawn and the tower, so it never needs to move.
//
// This example has no Memory rule (that is a code/ bot convention, not a
// Dojo one), so the "do this once" flags below are plain module-scope
// variables — the scenario's VM is not reset mid-run, so they persist across
// ticks exactly the way Memory would, without the serialization cost.
let ticksRun = 0;
let renewedPC1 = false;
let shieldedPC1 = false;
let placedOperatedTower = false;
let placedOperatedSpawn = false;
let spawnedSmallCreep = false;

module.exports.loop = function () {
	ticksRun++;

	const room = Game.rooms.W0N0;
	const controller = room.controller;
	const powerSpawn = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_POWER_SPAWN } })[0];
	const spawn = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_SPAWN } })[0];
	const tower = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } })[0];

	const report = { tick: Game.time, controllerPowered: controller.isPowerEnabled };

	const pc1 = Game.powerCreeps.PC1;
	if (pc1) {
		if (!pc1.room) {
			// Unspawned: pc1.ticksToLive reads NaN here (no ageTime yet) and
			// pc1.shard is always undefined in the mockup, so pc1.room is the
			// only reliable spawned/unspawned check (see README "Power creeps").
			if (powerSpawn) pc1.spawn(powerSpawn);
		} else {
			// Renew once, on the first tick it has a room: it is still standing
			// on the power spawn's own tile (range 0), which is within renew's
			// range-1 requirement, and shows the renew flash in the replay.
			if (!renewedPC1 && powerSpawn) {
				pc1.renew(powerSpawn);
				renewedPC1 = true;
			}
			if (!controller.isPowerEnabled) {
				if (pc1.pos.inRangeTo(controller, 1)) pc1.enableRoom(controller);
				else pc1.moveTo(controller);
			} else {
				// GENERATE_OPS is self-targeted (no range check) and free of ops,
				// so it can run every time it is off cooldown.
				const generateOps = pc1.powers[PWR_GENERATE_OPS];
				if (generateOps && generateOps.cooldown === 0) pc1.usePower(PWR_GENERATE_OPS);
				// SHIELD costs no ops in the engine (usePower.js only checks
				// POWER_INFO[power].ops, which PWR_SHIELD has none of) — a single
				// call at a fixed tick is enough to show the rampart appearing.
				if (!shieldedPC1 && ticksRun === 30) {
					pc1.usePower(PWR_SHIELD);
					shieldedPC1 = true;
				}
			}
			report.pc1 = { x: pc1.pos.x, y: pc1.pos.y, ops: (pc1.store && pc1.store[RESOURCE_OPS]) || 0 };
		}
	}

	if (controller.isPowerEnabled) {
		const placed = Game.powerCreeps.Placed;
		if (placed) {
			// usePower fills one intent slot per creep per tick (like move or
			// attack), so a second usePower call the same tick silently replaces
			// the first rather than queuing behind it — these must land on
			// separate ticks. 10 ops + 100 ops = 110, well inside Placed's
			// 300-ops store (map.W0N0.json).
			if (!placedOperatedTower && tower) {
				placed.usePower(PWR_OPERATE_TOWER, tower);
				placedOperatedTower = true;
			} else if (!placedOperatedSpawn && spawn) {
				placed.usePower(PWR_OPERATE_SPAWN, spawn);
				placedOperatedSpawn = true;
			}
			report.placed = { ops: (placed.store && placed.store[RESOURCE_OPS]) || 0 };
		}
	}

	// Spawn one small creep once OPERATE_SPAWN's effect has actually landed on
	// the spawn, so the shorter spawn time it grants is observable.
	if (!spawnedSmallCreep && spawn && Array.isArray(spawn.effects)
		&& spawn.effects.some(function (effect) { return effect.power === PWR_OPERATE_SPAWN; })) {
		spawn.spawnCreep([MOVE], 'Small');
		spawnedSmallCreep = true;
	}

	console.log('BOTREPORT' + JSON.stringify(report));
};
