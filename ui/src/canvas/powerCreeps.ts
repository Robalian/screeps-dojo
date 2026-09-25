import type { FrameObject } from '../api/types.ts';
import type { PowerImages } from './powerImages.ts';
import { POWER_BY_ID } from '../game/powerInfo.ts';
import { text } from './primitives.ts';
import { RENDER_COLORS } from './renderConstants.ts';
import { POWER_CREEP_ART } from './powerCreepArt.ts';

// Official sprite is 180 units = 1.8 tiles across a 128-unit SVG box.
const SPRITE_TILES = 1.8;
const SVG_BOX = 128;

export function powerCreepTier(level: number): number {
	return Math.max(0, Math.min(4, Math.ceil((level || 0) / 6)));
}

// One plate = one or more closed subpaths, filled even-odd so the hull's
// inner cut-out stays a hole (a single-rule fill would paint over the body).
function plate(ctx: CanvasRenderingContext2D, subpaths: readonly (readonly number[])[], color: string): void {
	ctx.beginPath();
	for (const points of subpaths) {
		ctx.moveTo(points[0], points[1]);
		for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
		ctx.closePath();
	}
	ctx.fillStyle = color;
	ctx.fill('evenodd');
}

// The glow is identical for every power creep in local space, so build it
// once per context instead of allocating a gradient per creep per frame.
const glowCache = new WeakMap<object, CanvasGradient>();
function glowFor(ctx: CanvasRenderingContext2D): CanvasGradient | null {
	if (!ctx.createRadialGradient) return null;
	let glow = glowCache.get(ctx);
	if (!glow) {
		glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.2);
		glow.addColorStop(0, RENDER_COLORS.powerCreep.glow);
		glow.addColorStop(1, 'rgba(255,85,85,0)');
		glowCache.set(ctx, glow);
	}
	return glow;
}

// Local space: already translated to the tile centre and rotated to facing
// (CreepRenderer.draw). The art faces "up" in its SVG, like the creep body.
export function drawPowerCreep(ctx: CanvasRenderingContext2D, object: FrameObject, ownerColor: string): void {
	const tiers = POWER_CREEP_ART.operator;
	const tier = tiers[powerCreepTier(Number(object.level) || 0)];
	// soft glow under the body (official: 4-tile 'glow' sprite tinted #FF5555)
	const glow = glowFor(ctx);
	if (glow) {
		ctx.save();
		ctx.globalAlpha *= 0.25;
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	ctx.save();
	const scale = SPRITE_TILES / SVG_BOX;
	ctx.scale(scale, scale);
	ctx.translate(-SVG_BOX / 2, -SVG_BOX / 2);
	for (const shape of tier.plates) {
		plate(ctx, shape.subpaths, shape.lit ? RENDER_COLORS.powerCreep.tint : RENDER_COLORS.powerCreep.dark);
	}
	ctx.beginPath();
	ctx.arc(tier.disc.cx, tier.disc.cy, tier.disc.r * 0.9, 0, Math.PI * 2);
	ctx.fillStyle = ownerColor;
	ctx.fill();
	ctx.restore();
}

// A power creep's spawn: a red flare over its tile that shrinks away as the
// creep settles in. Progress null (paused) holds it at its brightest instant
// (p=0.5) rather than the fully-appeared end, so a scrub-to-spawn frame still
// reads as "something happened here".
export function drawSpawnFlare(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number | null): void {
	const p = progress === null ? 0.5 : progress;
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(Math.PI / 8 * p);
	ctx.globalAlpha = 1 - p;
	ctx.fillStyle = RENDER_COLORS.powerCreep.spawnFlare;
	ctx.beginPath();
	ctx.arc(0, 0, 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

// renewCreep: a green disc-and-ring flash on the power creep's own tile,
// brightest at the midpoint of the tick.
export function drawRenewFlash(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number | null): void {
	const p = progress === null ? 0.5 : progress;
	const alpha = 0.5 * Math.sin(Math.PI * p);
	ctx.save();
	ctx.fillStyle = RENDER_COLORS.powerCreep.renew;
	ctx.strokeStyle = RENDER_COLORS.powerCreep.renew;
	ctx.lineWidth = 0.1;
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(cx, cy, 0.55, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(cx, cy, 0.85, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

// usePower's icon pop: the power's texture (or a vector badge, unloaded/no
// artwork) growing and fading in over the target tile. Scale runs 0.5→1 across
// the whole pop; alpha rises to the midpoint and fades back — a pop, not a
// hold. Paused (progress null) freezes it fully grown at a legible alpha.
export function drawPowerIcon(
	ctx: CanvasRenderingContext2D,
	powerId: number,
	cx: number,
	cy: number,
	progress: number | null,
	images?: PowerImages,
): void {
	const power = POWER_BY_ID[powerId];
	const paused = progress === null;
	const p = paused ? 0 : (progress as number);
	const scale = paused ? 1 : 0.5 + 0.5 * p;
	const alpha = paused ? 0.8 : 1 - Math.abs(2 * p - 1);
	ctx.save();
	ctx.globalAlpha = alpha;
	const image = power && power.icon ? images?.[power.icon] : undefined;
	if (image) {
		// Official sprite: 3 tiles across at full pop.
		const size = 3 * scale;
		ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
	} else {
		const ringRadius = 1.2 * scale;
		ctx.beginPath();
		ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
		ctx.strokeStyle = RENDER_COLORS.powerCreep.beam;
		ctx.lineWidth = 0.12;
		ctx.stroke();
		ctx.save();
		ctx.globalAlpha = alpha * 0.35;
		ctx.fillStyle = RENDER_COLORS.powerCreep.iconFill;
		ctx.beginPath();
		ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		const short = power ? power.short : '?';
		const fontSize = 0.9 * scale;
		text(ctx, short, cx, cy + 0.35 * fontSize, { font: fontSize, align: 'center', fill: RENDER_COLORS.powerCreep.iconFill });
	}
	ctx.restore();
}
