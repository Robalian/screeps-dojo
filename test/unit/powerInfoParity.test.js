'use strict';

// ui/src/game/powerInfo.ts is the UI's copy of POWER_INFO. It is only allowed
// to exist because this test pins every number to the running engine's.
const assert = require('assert');
const C = require('@screeps/common/lib/constants');

describe('powerInfo.ts parity with @screeps/common POWER_INFO', function () {
	let model;
	before(async function () { model = await import('../../ui/src/game/powerInfo.ts'); });

	it('covers exactly the engine operator powers', function () {
		const engineIds = Object.keys(C.POWER_INFO).map(Number).sort((a, b) => a - b);
		assert.deepStrictEqual(model.POWERS.map(p => p.id).sort((a, b) => a - b), engineIds);
	});

	it('names every power by its PWR_ constant', function () {
		for (const power of model.POWERS) assert.strictEqual(C['PWR_' + power.key], power.id, power.key);
	});

	it('matches level, range, cooldown, duration, ops, energy, effect, period', function () {
		for (const power of model.POWERS) {
			const info = C.POWER_INFO[power.id];
			for (const field of ['level', 'range', 'cooldown', 'duration', 'ops', 'energy', 'effect', 'period']) {
				assert.deepStrictEqual(
					power[field] === undefined ? undefined : JSON.parse(JSON.stringify(power[field])),
					info[field], power.key + '.' + field);
			}
		}
	});

	it('uses the engine effect ids and max levels', function () {
		assert.strictEqual(model.EFFECT_INVULNERABILITY, C.EFFECT_INVULNERABILITY);
		assert.strictEqual(model.EFFECT_COLLAPSE_TIMER, C.EFFECT_COLLAPSE_TIMER);
		assert.strictEqual(model.POWER_CREEP_MAX_LEVEL, C.POWER_CREEP_MAX_LEVEL);
	});
});
