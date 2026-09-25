import type { FrameObject } from '../api/types.ts';
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
