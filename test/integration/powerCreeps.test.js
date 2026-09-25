'use strict';
// Mocha hosts this suite's mock servers sequentially in one dedicated
// process — see capture.test.js.
process.env.DOJO_MOCK_ENGINE_PROCESS_ISOLATED = '1';
const assert = require('assert');
const DojoWorld = require('../../src/dojoWorld');

function walledRoom(name) {
	const rows = ['#'.repeat(50)];
	for (let y = 1; y < 49; y++) rows.push('#' + '.'.repeat(48) + '#');
	rows.push('#'.repeat(50));
	return { room: name, terrain: rows, structures: [], creeps: [] };
}

// RCL8 home with a power spawn and a tower; the controller is power-enabled
// from the map so usePower works without an enableRoom walk.
function homeMap() {
	const map = walledRoom('W0N0');
	map.controller = { x: 5, y: 5, level: 8, owner: 'me', isPowerEnabled: true };
	map.structures.push(
		{ type: 'spawn', x: 20, y: 20, owner: 'me' },
		{ type: 'powerSpawn', x: 25, y: 20, owner: 'me', store: { energy: 5000, power: 100 } },
		{ type: 'tower', x: 30, y: 30, owner: 'me', store: { energy: 1000 } }
	);
	map.powerCreeps = [
		{ name: 'Placed', x: 31, y: 31, owner: 'me', powers: { GENERATE_OPS: 1, OPERATE_TOWER: 1 }, store: { ops: 100 } }
	];
	return map;
}

// Unspawned power creeps have ticksToLive = NaN, not undefined (engine
// game/power-creeps.js:72 reads ageTime from an account doc that has none),
// so "is it spawned?" is `pc.room`, never a ticksToLive check.
const BOT = `
module.exports.loop = function () {
	const spawn = Object.values(Game.structures).find(s => s.structureType === STRUCTURE_POWER_SPAWN);
	const unspawned = Game.powerCreeps.PC1;
	if (unspawned && !unspawned.room && spawn) unspawned.spawn(spawn);
	const placed = Game.powerCreeps.Placed;
	if (placed && placed.room) {
		const tower = placed.room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER })[0];
		if (Game.time % 2 === 0) placed.usePower(PWR_OPERATE_TOWER, tower);
		else placed.usePower(PWR_GENERATE_OPS);
	}
};`;

describe('power creeps', function () {
	this.timeout(600000);
	let world;
	// actionLog is reset every tick and the powers' cooldowns are 10 (tower)
	// and 50 (ops), so the only ticks that show actionLog.power are the first
	// two. Record every tick from the start and assert over the whole run.
	const frames = [];
	before(async function () {
		world = new DojoWorld();
		await world.reset();
		world.modules = { main: BOT };
		world.powerCreepRoster = { gpl: 10, powerCreeps: [
			{ name: 'PC1', className: 'operator', powers: { GENERATE_OPS: 2, OPERATE_SPAWN: 1 } },
			{ name: 'Placed', className: 'operator', powers: { GENERATE_OPS: 1, OPERATE_TOWER: 1 } }
		] };
		// No botOptions: the map's own spawn is adopted as the home, so the
		// bootstrap Spawn1 is removed instead of sharing its tile.
		await world.loadScenarioMaps([homeMap()]);
		await world.start();
		for (let i = 0; i < 12; i++) {
			await world.tick();
			frames.push(await world.captureFrame());
		}
	});
	after(function () { if (world) world.stop(); });

	it('seeds one account doc per roster creep, with engine-shaped powers', async function () {
		const { db } = await world.world.load();
		const pc1 = await db['users.power_creeps'].findOne({ name: 'PC1' });
		assert.strictEqual(pc1.user, world.botUserId);
		assert.strictEqual(pc1.level, 3);
		assert.strictEqual(pc1.hitsMax, 4000);
		assert.strictEqual(pc1.storeCapacity, 400);
		assert.deepStrictEqual(pc1.powers, { 1: { level: 2 }, 2: { level: 1 } });
		assert.strictEqual((await db['users.power_creeps'].find({ name: 'Placed' })).length, 1, 'placed creep reuses its roster doc');
	});

	it('shares the _id between a placed creep and its account doc, and shows it in Game.powerCreeps', async function () {
		const { db } = await world.world.load();
		const account = await db['users.power_creeps'].findOne({ name: 'Placed' });
		const room = await db['rooms.objects'].findOne({ type: 'powerCreep', name: 'Placed' });
		assert.strictEqual(room._id, account._id);
		assert.strictEqual(account.spawnCooldownTime, null);
		const seen = JSON.parse(await world.evalInBot('JSON.stringify({ ttl: Game.powerCreeps.Placed.ticksToLive, lvl: Game.powerCreeps.Placed.level, gpl: Game.gpl.level })'));
		assert.ok(seen.ttl > 4900, 'placed creep gets a full lifetime by default');
		assert.strictEqual(seen.lvl, 2);
		assert.strictEqual(seen.gpl, 10, 'explicit gpl wins when it covers the roster');
	});

	it('lets the bot spawn a roster creep at its power spawn, under the account _id', async function () {
		const { db } = await world.world.load();
		const account = await db['users.power_creeps'].findOne({ name: 'PC1' });
		const spawned = await db['rooms.objects'].findOne({ type: 'powerCreep', name: 'PC1' });
		assert.ok(spawned, 'PC1 is in the room');
		assert.strictEqual(spawned.x, 25);
		assert.strictEqual(spawned._id, account._id);
		assert.strictEqual(account.spawnCooldownTime, null, 'alive: the engine cleared the cooldown');
	});

	it('records usePower in actionLog and writes an effect on the target', function () {
		const powerIds = new Set();
		let towerEffect = null;
		for (const frame of frames) {
			const placed = frame.objects.find(o => o.type === 'powerCreep' && o.name === 'Placed');
			if (placed && placed.actionLog && placed.actionLog.power) powerIds.add(placed.actionLog.power.id);
			const tower = frame.objects.find(o => o.type === 'tower');
			// The RAW rooms.objects doc's effects field is not necessarily an array:
			// usePower.js writes it via bulk.update(target, {effects: null}) then
			// bulk.update(target, {effects: [...]}), and @screeps/driver's bulk.js
			// update() merges an array source into `id[key] || {}` — since id.effects
			// is null after the first call, an empty OBJECT — so lodash _.merge({}, [x])
			// yields { "0": x }, not [x]. The bot-facing Game API still sees a proper
			// array (game/rooms.js RoomObject ctor normalizes via `_(effects).map(...)`,
			// which iterates object values same as array elements), but code reading the
			// raw doc — like this test, via captureFrame — must do the same.
			if (tower.effects) {
				const list = Object.values(tower.effects);
				if (list.length) towerEffect = list[0];
			}
		}
		assert.deepStrictEqual(Array.from(powerIds).sort(), [1, 3], 'GENERATE_OPS and OPERATE_TOWER both logged');
		assert.ok(towerEffect, 'OPERATE_TOWER effect on the tower');
		assert.strictEqual(towerEffect.power, 3);
		assert.ok(towerEffect.endTime > frames[0].gameTime);
	});

	it('applies isPowerEnabled from the map controller', async function () {
		const { db } = await world.world.load();
		const controller = await db['rooms.objects'].findOne({ type: 'controller', room: 'W0N0' });
		assert.strictEqual(controller.isPowerEnabled, true);
	});

	it('lists the bot\'s own power creeps in readState, keyed by name like creeps', async function () {
		const state = await world.readState();
		assert.deepStrictEqual(Object.keys(state.powerCreeps).sort(), ['PC1', 'Placed']);
	});

	it('refuses to place a power creep that is already in a room', async function () {
		await assert.rejects(world.addPowerCreep({ room: 'W0N0', x: 40, y: 40, name: 'Placed' }), /already placed/);
	});

	it('raises GPL to cover the roster when the asked level is too low', async function () {
		await world.setGpl(1);
		const { db } = await world.world.load();
		const user = await db.users.findOne({ _id: world.botUserId });
		// 2 creeps + (3 + 2) levels = 7
		assert.strictEqual(user.power, 1000 * 7 * 7);
	});

	it('resets a dead creep\'s wall-clock respawn cooldown on request', async function () {
		const { db } = await world.world.load();
		// Stand-in for a death: _diePowerCreep.js sets Date.now() + 8h.
		await db['users.power_creeps'].update({ name: 'PC1' }, { $set: { spawnCooldownTime: Date.now() + 8 * 3600 * 1000 } });
		await world.resetPowerCreepCooldown('PC1');
		assert.strictEqual((await db['users.power_creeps'].findOne({ name: 'PC1' })).spawnCooldownTime, 0);
	});
});
