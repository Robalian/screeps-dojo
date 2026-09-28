'use strict';

// Mocha hosts this suite's mock servers sequentially in one dedicated
// process — the isolation the fast mock-engine's in-process mode asserts
// (src/serverBoot.js); declare it, like smoke.js and runScenarioChild.js do.
process.env.DOJO_MOCK_ENGINE_PROCESS_ISOLATED = '1';

const assert = require('assert');
const DojoWorld = require('../../src/dojoWorld');

// Maps authored in the editor put EVERYTHING in structures[] — the loader
// must supply engine defaults (spawn stores, source energy) and must not
// duplicate the controller (addBot claims the map's own controller).
function borderTerrain() {
	const rows = [];
	for (let y = 0; y < 50; y++) {
		let row = '';
		for (let x = 0; x < 50; x++) {
			row += (x === 0 || x === 49 || y === 0 || y === 49) ? '#' : '.';
		}
		rows.push(row);
	}
	return rows;
}

describe('map structures[] defaults', function () {
	this.timeout(600000);
	let world;

	before(async function () {
		world = new DojoWorld();
		await world.reset();
		const map = {
			room: 'W0N0',
			terrain: borderTerrain(),
			structures: [
				{ type: 'controller', x: 22, y: 22, owner: 'me' },
				{ type: 'source', x: 6, y: 28 },
				{ type: 'spawn', x: 30, y: 30, owner: 'me' },
				// An editor-placed power bank: type/x/y only, everything else defaulted.
				{ type: 'powerBank', x: 12, y: 12 },
				// An IMPORTED one: its own haul and its remaining lifetime.
				{ type: 'powerBank', x: 14, y: 14, store: { power: 8727 }, ticksToDecay: 232 },
				// An editor tombstone (bare), a permanent and a closing portal, an
				// old-editor deposit with `cooldown`, and a nuke with no clock.
				{ type: 'tombstone', x: 22, y: 16, creepName: 'bob' },
				{ type: 'portal', x: 24, y: 16, destination: { room: 'W0N0', x: 5, y: 5 } },
				{ type: 'portal', x: 26, y: 16, destination: { room: 'W0N0', x: 5, y: 5 }, ticksToDecay: 500 },
				{ type: 'deposit', x: 28, y: 16, depositType: 'mist', cooldown: 30 },
				{ type: 'nuke', x: 30, y: 16, launchRoomName: 'W5N5' },
				// An imported dropped pile of a mineral (roomToMap shape).
				{ type: 'energy', x: 20, y: 16, resourceType: 'H', amount: 300, id: '6ab96725a78afb19e4127fd2' },
				// An editor-placed ruin, and an imported stronghold one (roomToMap shape).
				{ type: 'ruin', x: 16, y: 16 },
				// An older editor ruin: top-level structureType, owner 'unclaimed'.
				{ type: 'ruin', x: 18, y: 16, owner: 'unclaimed', structureType: 'tower' },
				{
					type: 'ruin', x: 17, y: 16, id: '6ab96336ad3e031a969d1d0c', owner: 'invader',
					structure: { id: '6ab84110c7926d4a99b9cb9b', type: 'rampart', hits: 0, hitsMax: 300000000 },
					store: { energy: 40 }, ticks: { decayTime: 40750, destroyTime: -3337 }
				}
			],
			flags: []
		};
		world.modules = { main: 'module.exports.loop = function () {};' };
		await world.loadScenarioMaps([map], { room: 'W0N0', x: 18, y: 17 });
		await world.start();
	});

	after(function () {
		if (world) world.stop();
	});

	it('places exactly one controller, claimed by the bot at level 1', async function () {
		const { db } = await world.world.load();
		const controllers = await db['rooms.objects'].find({ room: 'W0N0', type: 'controller' });
		assert.strictEqual(controllers.length, 1, 'no duplicate auto-injected controller');
		assert.strictEqual(controllers[0].x, 22);
		assert.strictEqual(controllers[0].user, world.botUserId, 'addBot claimed the map controller');
		assert.strictEqual(controllers[0].level, 1);
	});

	it('gives map-defined sources engine defaults so they are harvestable', async function () {
		const { db } = await world.world.load();
		const source = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'source' });
		assert.strictEqual(source.energy, 1000);
		assert.strictEqual(source.energyCapacity, 1000);
	});

	it('gives map-defined spawns store/hits/name defaults so they can spawn', async function () {
		const { db } = await world.world.load();
		const spawns = await db['rooms.objects'].find({ room: 'W0N0', type: 'spawn' });
		assert.strictEqual(spawns.length, 2, "addBot's Spawn1 + the map's spawn");
		const mapSpawn = spawns.find(function (spawn) { return spawn.x === 30; });
		assert.strictEqual(mapSpawn.name, 'Spawn2');
		assert.strictEqual(mapSpawn.store.energy, 300);
		assert.strictEqual(mapSpawn.hits, 5000);
		assert.strictEqual(mapSpawn.user, world.botUserId);
	});

	// The engine's `.power` getter is `o.store.power`, and a bank with no hits is
	// destroyed by the first point of damage — so an editor-placed bank needs both
	// filled in or it is useless as a target.
	it('gives a map-defined power bank a store, full hits and a decay clock', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const bank = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'powerBank', x: 12 });
		assert.ok(bank, 'the power bank was placed');
		assert.strictEqual(bank.store.power, 5000);            // POWER_BANK_CAPACITY_MAX
		assert.strictEqual(bank.hits, 2000000);                // POWER_BANK_HITS
		assert.strictEqual(bank.hitsMax, 2000000);
		// Absolute deadline, in `decayTime` (not nextDecayTime) — a null one would
		// have the engine delete the bank on its first processed tick.
		assert.ok(bank.decayTime > gameTime, 'seeded a live decay deadline');
		assert.strictEqual(bank.nextDecayTime, undefined);
	});

	it("keeps an imported power bank's own power and remaining lifetime", async function () {
		const { db } = await world.world.load();
		const bank = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'powerBank', x: 14 });
		assert.strictEqual(bank.store.power, 8727, 'the map value beats the default');
		assert.strictEqual(bank.hits, 2000000);
		// ticksToDecay is relative on the way in and must not survive on the doc.
		assert.strictEqual(bank.ticksToDecay, undefined);
		assert.ok(bank.decayTime > 0 && bank.decayTime <= 232 + 5, 'rebased onto the sim clock');
	});

	it('gives a bare tombstone the creep record and lifetime the engine would', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const tomb = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'tombstone' });
		assert.strictEqual(tomb.creepId, 'bob', 'the runtime only builds tombstone.creep when creepId is set');
		assert.deepStrictEqual(tomb.creepBody, []);
		assert.deepStrictEqual(tomb.store, {});
		assert.ok(tomb.decayTime > gameTime, 'the tombstone tick deletes one without a clock');
	});

	it('leaves a portal permanent unless it has a lifetime', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const permanent = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'portal', x: 24 });
		const closing = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'portal', x: 26 });
		assert.strictEqual(permanent.decayTime, undefined);
		assert.ok(closing.decayTime > gameTime && closing.decayTime <= gameTime + 500);
		assert.strictEqual(closing.ticksToDecay, undefined);
	});

	it("turns an old editor deposit's cooldown into the cooldownTime the engine reads", async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const deposit = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'deposit' });
		assert.strictEqual(deposit.cooldown, undefined);
		assert.ok(deposit.cooldownTime > gameTime && deposit.cooldownTime <= gameTime + 30);
	});

	it('gives a nuke with no clock the full flight time', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const nuke = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'nuke' });
		assert.ok(nuke.landTime > gameTime + 40000, 'NUKE_LAND_TIME is 50000');
	});

	// The runtime's Resource.amount is o[o.resourceType]; a literal `amount` is ignored.
	it('loads a dropped pile in the engine shape', async function () {
		const { db } = await world.world.load();
		const pile = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'energy', x: 20 });
		assert.strictEqual(pile._id, '6ab96725a78afb19e4127fd2');
		assert.strictEqual(pile.resourceType, 'H');
		assert.strictEqual(pile.H, 300);
		assert.strictEqual(pile.amount, undefined);
	});

	// The ruin tick deletes a ruin with no decayTime on its first pass.
	it('gives a map-defined ruin a decay clock', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const ruin = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'ruin', x: 16 });
		assert.ok(ruin, 'the ruin was placed');
		assert.ok(ruin.decayTime > gameTime, 'seeded a live decay deadline');
		// the runtime's ruin.structure getter dereferences this
		assert.strictEqual(ruin.structure.type, 'constructedWall');
		assert.deepStrictEqual(ruin.store, {});
	});

	it("moves an old top-level structureType into structure, and 'unclaimed' means no owner", async function () {
		const { db } = await world.world.load();
		const ruin = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'ruin', x: 18 });
		assert.strictEqual(ruin.structure.type, 'tower');
		assert.strictEqual(ruin.structureType, undefined);
		assert.strictEqual(ruin.user, undefined);
		assert.strictEqual(ruin.structure.user, undefined);
	});

	it('loads an imported ruin with its clocks rebased and its structure owner resolved', async function () {
		const { db } = await world.world.load();
		const gameTime = await world.world.gameTime;
		const ruin = await db['rooms.objects'].findOne({ room: 'W0N0', type: 'ruin', x: 17 });
		assert.strictEqual(ruin._id, '6ab96336ad3e031a969d1d0c');
		assert.strictEqual(ruin.user, '2');
		// the runtime's ruin.structure.owner looks this up by user id
		assert.deepStrictEqual(ruin.structure, {
			id: '6ab84110c7926d4a99b9cb9b', type: 'rampart', hits: 0, hitsMax: 300000000, user: '2'
		});
		assert.deepStrictEqual(ruin.store, { energy: 40 });
		assert.strictEqual(ruin.ticks, undefined);
		assert.ok(ruin.decayTime > gameTime && ruin.decayTime <= gameTime + 40750);
		assert.ok(ruin.destroyTime < gameTime);
	});
});
