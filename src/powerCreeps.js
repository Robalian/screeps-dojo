'use strict';

// Power creep helpers shared by the world and the runner. The roster rules live
// in ONE place — ui/src/game/powerRoster.ts — which Node 24 loads directly
// (type stripping), exactly as src/render/videoRenderer.js loads the canvas.
const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '..', 'ui', 'src', 'game', 'powerRoster.ts');
let modelPromise = null;

function loadPowerModel() {
	if (!modelPromise) modelPromise = import(require('url').pathToFileURL(MODEL_PATH).href);
	return modelPromise;
}

const ROSTER_FILE = 'power-creeps.json';

// A scenario's power creeps are its own power-creeps.json: present means
// "these are available to the main bot", absent means none. No global list.
async function loadRosterFor(scenarioDir) {
	let text;
	try { text = fs.readFileSync(path.join(scenarioDir, ROSTER_FILE), 'utf8'); } catch (e) {
		if (e.code === 'ENOENT') return { roster: null, warnings: [] };
		throw e;
	}
	const model = await loadPowerModel();
	const parsed = model.parseRoster(text);
	const errors = parsed.issues.filter(i => i.severity === 'error');
	if (errors.length) {
		throw new Error(errors.map(i => ROSTER_FILE + ': ' + (i.path ? i.path + ': ' : '') + i.message).join('; '));
	}
	return { roster: parsed.roster, warnings: parsed.issues.map(i => ROSTER_FILE + ': ' + i.message) };
}

module.exports = { loadPowerModel, loadRosterFor, ROSTER_FILE };
