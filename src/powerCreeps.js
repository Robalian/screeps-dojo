'use strict';

// Power creep helpers shared by the world and the runner. The roster rules live
// in ONE place — ui/src/game/powerRoster.ts — which Node 24 loads directly
// (type stripping), exactly as src/render/videoRenderer.js loads the canvas.
const path = require('path');

const MODEL_PATH = path.join(__dirname, '..', 'ui', 'src', 'game', 'powerRoster.ts');
let modelPromise = null;

function loadPowerModel() {
	if (!modelPromise) modelPromise = import(require('url').pathToFileURL(MODEL_PATH).href);
	return modelPromise;
}

module.exports = { loadPowerModel };
