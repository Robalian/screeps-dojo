'use strict';

// One-off generator: vendors official power-creep art from the screeps/renderer
// repo (ISC licence) into this project.
//
//   node scripts/extractPowerArt.cjs <path-to-renderer-checkout> [sha]
//
// Writes:
//   ui/src/canvas/powerCreepArt.ts               - operator body plate polygons, tiers 0-4
//   ui/src/assets/screeps-renderer/powers/*.png   - 18 power icons, rasterised at 128x128
//
// Must run where @napi-rs/canvas's native binary is installed (the `dojo`
// docker service), and the renderer checkout must already exist locally: see
// ui/src/assets/screeps-renderer/README.md for the exact clone command.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadImage, createCanvas } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..');
const ART_OUT = path.join(ROOT, 'ui/src/canvas/powerCreepArt.ts');
const ICONS_OUT_DIR = path.join(ROOT, 'ui/src/assets/screeps-renderer/powers');

// Renderer texture keys for the 18 powers with icons (OPERATE_FACTORY has none).
const ICON_KEYS = [
	'generate-ops', 'operate-spawn', 'operate-tower', 'operate-storage', 'operate-lab',
	'operate-extension', 'operate-observer', 'operate-terminal', 'disrupt-spawn', 'disrupt-tower',
	'disrupt-source', 'shield', 'regen-source', 'regen-mineral', 'disrupt-terminal',
	'operate-power', 'fortify', 'operate-controller'
];

const ALLOWED_PATH_COMMANDS = 'MmHhVvLlZz';

// --- SVG <style> class resolution -------------------------------------------------

// Parses `.cls-1,.cls-2{fill:none;}` style blocks into { className: { prop: value } }.
function extractStyleMap(svgText) {
	const styleMatch = svgText.match(/<style[^>]*>([\s\S]*?)<\/style>/);
	const map = {};
	if (!styleMatch) return map;
	const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
	let rule;
	while ((rule = ruleRe.exec(styleMatch[1]))) {
		const selectors = rule[1].split(',').map((s) => s.trim()).filter(Boolean);
		const decls = {};
		for (const pair of rule[2].split(';')) {
			const idx = pair.indexOf(':');
			if (idx === -1) continue;
			const prop = pair.slice(0, idx).trim();
			const value = pair.slice(idx + 1).trim();
			if (prop && value) decls[prop] = value;
		}
		for (const selector of selectors) {
			if (!selector.startsWith('.')) continue;
			const className = selector.slice(1);
			map[className] = Object.assign({}, map[className], decls);
		}
	}
	return map;
}

// @napi-rs/canvas's SVG loader drops <style> class rules (confirmed by eye: a
// generate-ops icon rasterised solid black instead of red/yellow). Inline each
// class's declarations as presentation attributes before loadImage sees it.
function inlineStyleClasses(svgText) {
	const styleMap = extractStyleMap(svgText);
	if (Object.keys(styleMap).length === 0) return svgText;
	let out = svgText.replace(/<style[^>]*>[\s\S]*?<\/style>/, '');
	out = out.replace(/\sclass="([^"]+)"/g, (full, classNames) => {
		const merged = {};
		for (const className of classNames.trim().split(/\s+/)) Object.assign(merged, styleMap[className]);
		return Object.entries(merged).map(([prop, value]) => ` ${prop}="${value}"`).join('');
	});
	return out;
}

// These icon SVGs carry only viewBox="0 0 32.73 32.73", no width/height, so
// @napi-rs/canvas loads them at ~33px and the PNG upscales blurry.
function injectExplicitSize(svgText, size) {
	return svgText.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

// --- operator-lvl{0..4}.svg parsing -------------------------------------------------

function parseAttrs(tag) {
	const attrs = {};
	const attrRe = /([\w:-]+)="([^"]*)"/g;
	let m;
	while ((m = attrRe.exec(tag))) attrs[m[1]] = m[2];
	return attrs;
}

function resolveFill(attrs, styleMap) {
	if (attrs.fill !== undefined) return attrs.fill;
	if (attrs.class) {
		const merged = {};
		for (const className of attrs.class.trim().split(/\s+/)) Object.assign(merged, styleMap[className]);
		if (merged.fill !== undefined) return merged.fill;
	}
	return undefined;
}

function round(n) {
	const r = Math.round(n * 100) / 100;
	return r === 0 ? 0 : r; // normalise -0
}

// Parses the linear subset of SVG path data (M m H h V v L l Z z) into
// subpaths of flat [x0, y0, x1, y1, ...] coordinates. A closing point that
// duplicates the subpath's start is dropped (Z/z already implies it).
function parseLinearSubpaths(d) {
	const tokens = d.match(/[MmHhVvLlZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
	const subpaths = [];
	let current = [];
	let cx = 0, cy = 0;
	let startX = 0, startY = 0;
	let cmd = null;
	let i = 0;
	const next = () => parseFloat(tokens[i++]);
	while (i < tokens.length) {
		const tok = tokens[i];
		if (tok.length === 1 && ALLOWED_PATH_COMMANDS.includes(tok)) { cmd = tok; i++; }
		switch (cmd) {
			case 'M':
				if (current.length) { subpaths.push(current); current = []; }
				cx = next(); cy = next();
				startX = cx; startY = cy;
				current.push(round(cx), round(cy));
				cmd = 'L'; // subsequent bare coordinate pairs are implicit linetos
				break;
			case 'm':
				if (current.length) { subpaths.push(current); current = []; }
				cx += next(); cy += next();
				startX = cx; startY = cy;
				current.push(round(cx), round(cy));
				cmd = 'l';
				break;
			case 'H': cx = next(); current.push(round(cx), round(cy)); break;
			case 'h': cx += next(); current.push(round(cx), round(cy)); break;
			case 'V': cy = next(); current.push(round(cx), round(cy)); break;
			case 'v': cy += next(); current.push(round(cx), round(cy)); break;
			case 'L': cx = next(); cy = next(); current.push(round(cx), round(cy)); break;
			case 'l': cx += next(); cy += next(); current.push(round(cx), round(cy)); break;
			case 'Z':
			case 'z': {
				if (current.length > 2) {
					const lastX = current[current.length - 2], lastY = current[current.length - 1];
					if (Math.abs(lastX - startX) < 1e-6 && Math.abs(lastY - startY) < 1e-6) current.length -= 2;
				}
				subpaths.push(current);
				current = [];
				cx = startX; cy = startY;
				cmd = null; // a new subpath must start with an explicit M/m
				break;
			}
			default:
				throw new Error(`unsupported path command "${cmd}" in: ${d}`);
		}
	}
	if (current.length) subpaths.push(current);
	return subpaths;
}

function vertexCount(subpaths) {
	return subpaths.reduce((sum, sub) => sum + sub.length / 2, 0);
}

function validateOnlyLinearCommands(d) {
	for (const ch of d.match(/[A-Za-z]/g) || []) {
		if (!ALLOWED_PATH_COMMANDS.includes(ch)) {
			throw new Error(`filled path uses unsupported command "${ch}" (only ${ALLOWED_PATH_COMMANDS} are handled): ${d}`);
		}
	}
}

function parsePolygonPoints(pointsAttr) {
	return pointsAttr.trim().split(/\s+/).map((pair) => {
		const [x, y] = pair.split(',').map(Number);
		return [round(x), round(y)];
	}).flat();
}

// Parses one operator-lvl{N}.svg into { plates, disc }. See
// ui/src/assets/screeps-renderer/README.md for what each element is.
function parseOperatorTier(svgText) {
	const styleMap = extractStyleMap(svgText);
	const plates = [];
	let disc = null;
	const tagRe = /<(path|polygon|circle)\b[^>]*\/?>/g;
	let m;
	while ((m = tagRe.exec(svgText))) {
		const tag = m[0];
		const tagName = m[1];
		const attrs = parseAttrs(tag);
		if (tagName === 'circle') {
			// The disc: r ~= 28.6 at (64, 76). lvl4's circle has no fill (the
			// renderer fills it with the owner colour) - take the geometry anyway.
			disc = { cx: round(Number(attrs.cx)), cy: round(Number(attrs.cy)), r: round(Number(attrs.r)) };
			continue;
		}
		if (tagName === 'polygon') {
			const fill = resolveFill(attrs, styleMap);
			if (fill === undefined || fill === 'none') continue;
			const flat = parsePolygonPoints(attrs.points || '');
			if (flat.length < 6) continue; // fewer than 3 vertices
			plates.push({ subpaths: [flat], lit: fill.toUpperCase() === '#FFFFFF' });
			continue;
		}
		// path
		const fill = resolveFill(attrs, styleMap);
		if (fill === undefined || fill === 'none') continue; // the unfilled ring, skipped by design
		validateOnlyLinearCommands(attrs.d || '');
		const subpaths = parseLinearSubpaths(attrs.d || '');
		if (vertexCount(subpaths) < 3) continue; // degenerate one-vertex path (M58,12.8)
		plates.push({ subpaths, lit: fill.toUpperCase() === '#FFFFFF' });
	}
	if (!disc) throw new Error('no disc <circle> found');
	return { plates, disc };
}

// --- output ---------------------------------------------------------------

function formatSubpath(sub) {
	return `[${sub.join(', ')}]`;
}

function formatTier(tier) {
	const plateLines = tier.plates.map((plate) => {
		const subpathsStr = plate.subpaths.map(formatSubpath).join(', ');
		return `\t\t\t\t{ subpaths: [${subpathsStr}], lit: ${plate.lit} }`;
	}).join(',\n');
	return `\t\t{\n\t\t\tplates: [\n${plateLines}\n\t\t\t],\n\t\t\tdisc: { cx: ${tier.disc.cx}, cy: ${tier.disc.cy}, r: ${tier.disc.r} }\n\t\t}`;
}

function writePowerCreepArt(tiers, sha) {
	const tiersStr = tiers.map(formatTier).join(',\n');
	const content = `// GENERATED FILE - do not edit by hand.
// Produced by scripts/extractPowerArt.cjs from screeps/renderer@${sha}
// (metadata/images/operator-lvl0.svg .. operator-lvl4.svg), which is ISC
// licensed:
//
// Copyright (c) 2016, Artem Chivchalov <contact@screeps.com>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// See ui/src/assets/screeps-renderer/LICENSE for the full notice.

// One plate of the operator power creep's body art, filled with the
// 'evenodd' rule so a compound path with a hole (the hexagonal hull) keeps
// its hole. Coordinates are in the source SVG's 128x128 box.
export interface PowerCreepArtPlate {
\tsubpaths: number[][];
\t// White in the source SVG; the renderer tints lit plates red.
\tlit: boolean;
}

export interface PowerCreepArtTier {
\tplates: PowerCreepArtPlate[];
\tdisc: { cx: number; cy: number; r: number };
}

// Indexed by power creep level, tiers 0-4.
export const POWER_CREEP_ART: Record<'operator', PowerCreepArtTier[]> = {
\toperator: [
${tiersStr}
\t]
};
`;
	fs.mkdirSync(path.dirname(ART_OUT), { recursive: true });
	fs.writeFileSync(ART_OUT, content);
	console.log('wrote', path.relative(ROOT, ART_OUT));
}

async function rasterizeIcons(rendererDir) {
	fs.mkdirSync(ICONS_OUT_DIR, { recursive: true });
	for (const key of ICON_KEYS) {
		const svgPath = path.join(rendererDir, 'metadata/images', `${key}.svg`);
		let svgText = fs.readFileSync(svgPath, 'utf8');
		svgText = inlineStyleClasses(svgText);
		svgText = injectExplicitSize(svgText, 128);
		const image = await loadImage(Buffer.from(svgText, 'utf8'));
		const canvas = createCanvas(128, 128);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0, 128, 128);
		const outPath = path.join(ICONS_OUT_DIR, `${key}.png`);
		fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
		console.log('wrote', path.relative(ROOT, outPath));
	}
}

function getSha(rendererDir, providedSha) {
	if (providedSha) return providedSha;
	try {
		return execFileSync('git', ['-C', rendererDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	} catch (error) {
		return 'unknown';
	}
}

async function main() {
	const rendererDir = process.argv[2];
	if (!rendererDir) {
		console.error('usage: node scripts/extractPowerArt.cjs <path-to-renderer-checkout> [sha]');
		process.exit(1);
	}
	const sha = getSha(rendererDir, process.argv[3]);
	const tiers = [];
	for (let level = 0; level <= 4; level++) {
		const svgText = fs.readFileSync(path.join(rendererDir, 'metadata/images', `operator-lvl${level}.svg`), 'utf8');
		tiers.push(parseOperatorTier(svgText));
	}
	writePowerCreepArt(tiers, sha);
	await rasterizeIcons(rendererDir);
	console.log('done. lit plate counts per tier:', tiers.map((t) => t.plates.filter((p) => p.lit).length));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
