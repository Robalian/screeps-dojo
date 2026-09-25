'use strict';

// "Import from server" in a scenario's power-creeps.json editor: reads the LIVE
// account's power creeps into a roster draft. Never writes — the editor shows
// it and the Edit tab's Save writes it.
const scenarioSettings = require('../../scenarioSettings');
const screepsProfiles = require('../../screepsProfiles');
const { loadEnvConfig } = require('../../envConfig');
const { resolveScenarioPath } = require('../../scenarioTree');
const { loadPowerModel, rosterFromLive } = require('../../powerCreeps');

module.exports = function registerPowerCreepRoutes(router, ctx) {
	router.post('/api/scenarios/:name/power-creeps/import', async function (req, res) {
		if (!ctx.isReady()) { ctx.sendJson(res, 503, { error: 'starting up' }); return; }
		let dir;
		try { dir = resolveScenarioPath(ctx.scenariosRoot, req.params.name); } catch (e) { ctx.sendJson(res, 400, { error: e.message }); return; }
		let client;
		try {
			const env = loadEnvConfig();
			const asked = String((req.body && req.body.server) || '').trim().toLowerCase();
			const server = asked || scenarioSettings.load(dir).settings.server || undefined;
			const { createClient } = require('../../import/screepsClient');
			client = createClient(screepsProfiles.resolve(server, env));
			const [list, power] = await Promise.all([client.powerCreeps(), client.gplPower()]);
			const model = await loadPowerModel();
			ctx.sendJson(res, 200, { content: model.serializeRoster(rosterFromLive(list, power, model)) });
		} catch (e) {
			ctx.sendJson(res, 200, { error: String((e && e.message) || e) });
		} finally { if (client) client.disconnect(); }
	});
};
