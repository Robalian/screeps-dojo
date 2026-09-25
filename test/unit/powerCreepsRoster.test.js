'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadRosterFor, ROSTER_FILE } = require('../../src/powerCreeps');

describe('scenario power creep roster', function () {
	let dir;
	beforeEach(function () { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dojo-pc-')); });
	const write = text => fs.writeFileSync(path.join(dir, ROSTER_FILE), text);

	it('returns no roster when the scenario has no power-creeps.json', async function () {
		assert.deepStrictEqual(await loadRosterFor(dir), { roster: null, warnings: [] });
	});

	it('loads the scenario roster', async function () {
		write(JSON.stringify({ powerCreeps: [{ name: 'PC1', powers: { GENERATE_OPS: 1 } }] }));
		const loaded = await loadRosterFor(dir);
		assert.deepStrictEqual(loaded.roster.powerCreeps, [{ name: 'PC1', className: 'operator', powers: { GENERATE_OPS: 1 } }]);
	});

	it('fails with the file and field path on errors', async function () {
		write(JSON.stringify({ powerCreeps: [{ name: 'PC1', powers: { OPERATE_SPAWNN: 1 } }] }));
		await assert.rejects(loadRosterFor(dir), /power-creeps\.json: powerCreeps\[0\]\.powers\.OPERATE_SPAWNN: unknown power/);
	});

	it('fails with the file name on invalid JSON', async function () {
		write('{ nope');
		await assert.rejects(loadRosterFor(dir), /power-creeps\.json: invalid JSON/);
	});

	it('passes warnings through with the file name', async function () {
		write(JSON.stringify({ powerCreeps: [{ name: 'R', powers: { REGEN_SOURCE: 1 } }] }));
		const loaded = await loadRosterFor(dir);
		assert.ok(loaded.warnings[0].startsWith('power-creeps.json: '));
		assert.match(loaded.warnings[0], /not reachable in the real game/);
	});

	it('turns the live power-creeps list into a roster', async function () {
		const { rosterFromLive, loadPowerModel } = require('../../src/powerCreeps');
		const model = await loadPowerModel();
		const roster = rosterFromLive([
			{ _id: 'a', name: 'PC1', className: 'operator', level: 3, powers: { 1: { level: 2 }, 2: { level: 1, cooldownTime: 5 } }, room: 'E27S23' },
			{ _id: 'b', name: 'PC2', className: 'operator', level: 0, powers: {} }
		], 49000, model);
		assert.deepStrictEqual(roster, { gpl: 7, powerCreeps: [
			{ name: 'PC1', className: 'operator', powers: { GENERATE_OPS: 2, OPERATE_SPAWN: 1 } },
			{ name: 'PC2', className: 'operator', powers: {} }
		] });
		assert.ok(model.validateRoster(roster).roster, 'an imported roster is always valid');
	});
});
