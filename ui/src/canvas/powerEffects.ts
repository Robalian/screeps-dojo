import type { FrameObject } from '../api/types.ts';
import { effectEntries, POWER_BY_ID } from '../game/powerInfo.ts';
import { RENDER_COLORS } from './renderConstants.ts';
import type { PowerImages } from './powerImages.ts';
import { text } from './primitives.ts';

export interface ActiveEffect { power: number; level?: number; endTime: number; }
const NONE: ActiveEffect[] = [];

// Engine effect entries are {effect, power, level, endTime}; SHIELD's rampart
// entry has no `effect`. Expired entries stay in the doc forever (usePower.js
// only replaces), so "active" is endTime > gameTime — exactly the check the
// official renderer and the runtime getter make. Canvas draws power effects
// only (POWER_BY_ID[id] known); the two NPC effects (1001/1002) show only in
// the inspector, like the official client. Raw `effects` can be an
// index-keyed object rather than an array (Ruling F) — effectEntries() reads
// either shape.
export function activeEffects(object: FrameObject, gameTime: number): ActiveEffect[] {
	if (!object.effects) return NONE;
	const entries = effectEntries(object.effects) as Array<{ effect?: number; power?: number; level?: number; endTime?: number }>;
	if (entries.length === 0) return NONE;
	let out: ActiveEffect[] | null = null;
	for (const entry of entries) {
		if (!entry || typeof entry.endTime !== 'number' || entry.endTime <= gameTime) continue;
		const id = entry.power ?? entry.effect;
		if (typeof id !== 'number' || !POWER_BY_ID[id]) continue;
		(out ||= []).push({ power: id, level: entry.level, endTime: entry.endTime });
	}
	if (!out) return NONE;
	out.sort((a, b) => a.power - b.power);
	return out;
}

const PERIOD = 3.2, RISE = 0.2, FALL = 1.0, PEAK = 0.4;

function flareAlpha(t: number): number {
	const phase = ((t % PERIOD) + PERIOD) % PERIOD;
	if (phase < RISE) return PEAK * (phase / RISE);
	if (phase < RISE + FALL) return PEAK * (1 - (phase - RISE) / FALL);
	return 0;
}

// Flare pass: after structures, before RoomVisuals (official effects layer).
// A red radial pulse over the target's tile: rise to 0.4 over 0.2s, fall to 0
// over 1s, rest 2s (a 3.2s period), spinning 2π/s. Paused (subFrame === null)
// holds a steady, legible alpha rather than whatever instant the cycle landed
// on, so a scrubbed-to frame still shows something is active.
export function drawEffectFlares(
	ctx: CanvasRenderingContext2D, object: FrameObject, worldX: number, worldY: number,
	gameTime: number, subFrame: number | null,
): void {
	if (activeEffects(object, gameTime).length === 0) return;
	const cx = worldX + 0.5, cy = worldY + 0.5;
	const t = gameTime + (subFrame ?? 0);
	const alpha = subFrame === null ? 0.25 : flareAlpha(t);
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.translate(cx, cy);
	ctx.rotate((t % 1) * Math.PI * 2);
	ctx.fillStyle = RENDER_COLORS.powerCreep.effectFlare;
	ctx.beginPath();
	// four-point star reads as the official flare3 without a texture
	for (let i = 0; i < 8; i++) {
		const r = i % 2 === 0 ? 1.5 : 0.25;
		const a = (i * Math.PI) / 4;
		if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a)); else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
	}
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

// Pip pass: the very last thing drawn, after the rampart overlay, so SHIELD /
// FORTIFY targets (ramparts and walls) don't tint over it. Dojo-only: which
// power is active, readable even on a paused frame (spec D7). The official
// icons are drawn mostly in beam-red strokes, so a red-filled disc would
// swallow them — filled dark and outlined in beam red instead.
export function drawEffectPips(
	ctx: CanvasRenderingContext2D, object: FrameObject, worldX: number, worldY: number,
	gameTime: number, images?: PowerImages,
): void {
	const effects = activeEffects(object, gameTime);
	for (let i = 0; i < effects.length; i++) {
		const power = POWER_BY_ID[effects[i].power];
		const px = worldX + 0.82 - i * 0.44, py = worldY + 0.18;
		ctx.save();
		ctx.beginPath();
		ctx.arc(px, py, 0.21, 0, Math.PI * 2);
		ctx.fillStyle = RENDER_COLORS.powerCreep.dark;
		ctx.fill();
		ctx.lineWidth = 0.04;
		ctx.strokeStyle = RENDER_COLORS.powerCreep.beam;
		ctx.stroke();
		const image = power.icon ? images?.[power.icon] : undefined;
		if (image) ctx.drawImage(image, px - 0.19, py - 0.19, 0.38, 0.38);
		// never raw ctx.font: Skia would rasterise 0.16px text blank in the exporter
		else text(ctx, power.short, px, py + 0.35 * 0.16, { font: 0.16, align: 'center', fill: RENDER_COLORS.powerCreep.iconFill });
		ctx.restore();
	}
}
