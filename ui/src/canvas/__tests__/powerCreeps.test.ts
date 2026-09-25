import { describe, it, expect } from 'vitest';
import { mockCtx } from './mockCtx';
import { drawPowerCreep, drawPowerIcon, drawRenewFlash, drawSpawnFlare, powerCreepTier } from '../powerCreeps';
import { CreepRenderer } from '../creeps';
import { RENDER_COLORS } from '../renderConstants';
import { POWER_BY_KEY } from '../../game/powerInfo';
import type { FrameObject } from '../../api/types';

const pc = (extra: Partial<FrameObject> = {}) =>
	({ _id: 'p', type: 'powerCreep', room: 'W0N0', x: 5, y: 5, level: 7, className: 'operator', my: true, ...extra }) as FrameObject;

describe('power creep sprite', () => {
	it('picks the official art tier from the level', () => {
		expect([0, 1, 6, 7, 12, 13, 18, 19, 25].map(powerCreepTier)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
	});

	it('draws the tinted plates, the dark plates and the owner disc', () => {
		const { ctx, log } = mockCtx();
		drawPowerCreep(ctx, pc(), RENDER_COLORS.ownership.bot);
		const fills = log.filter((c) => c.op === 'set:fillStyle').map((c) => c.args[0]);
		expect(fills).toContain(RENDER_COLORS.powerCreep.tint);
		expect(fills).toContain(RENDER_COLORS.powerCreep.dark);
		expect(fills).toContain(RENDER_COLORS.ownership.bot);
	});

	it('is what CreepRenderer draws for type powerCreep, rotated like the creep body', () => {
		const { ctx, log } = mockCtx();
		new CreepRenderer().draw(ctx, pc(), 5, 5, 90, 1);
		expect(log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.tint)).toBe(true);
		// Dojo facing is atan2 in degrees; the art faces up like the official
		// texture (official calculateAngle = atan2 + π/2), so +90 — as drawBody.
		const rotate = log.find((c) => c.op === 'rotate');
		expect(rotate!.args[0]).toBeCloseTo((90 + 90) * Math.PI / 180);
	});

	it('fills plates with the even-odd rule so the hull keeps its hole', () => {
		const { ctx, log } = mockCtx();
		drawPowerCreep(ctx, pc(), RENDER_COLORS.ownership.bot);
		expect(log.some((c) => c.op === 'fill' && c.args[0] === 'evenodd')).toBe(true);
	});
});

describe('power action animations', () => {
	it('drawSpawnFlare fades the plain flare color via globalAlpha, never baked into the string', () => {
		const { ctx, log } = mockCtx();
		drawSpawnFlare(ctx, 5, 5, 0.25);
		expect(log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.spawnFlare)).toBe(true);
		const alphas = log.filter((c) => c.op === 'set:globalAlpha').map((c) => c.args[0] as number);
		expect(alphas).toContain(0.75); // 1 - p
	});

	it('drawRenewFlash fades the plain renew color by 0.5*sin(pi*p)', () => {
		const { ctx, log } = mockCtx();
		drawRenewFlash(ctx, 5, 5, 0.5);
		expect(log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.renew)).toBe(true);
		const alphas = log.filter((c) => c.op === 'set:globalAlpha').map((c) => c.args[0] as number);
		expect(alphas[0]).toBeCloseTo(0.5, 5); // sin(pi*0.5) = 1
	});

	it('drawPowerIcon paused (progress null) sits at scale 1, alpha 0.8', () => {
		const { ctx, log } = mockCtx();
		drawPowerIcon(ctx, POWER_BY_KEY.GENERATE_OPS.id, 5, 5, null);
		expect(log.some((c) => c.op === 'set:globalAlpha' && c.args[0] === 0.8)).toBe(true);
		expect(log.some((c) => c.op === 'fillText' && c.args[0] === 'GO')).toBe(true);
	});

	it('drawPowerIcon falls back to "?" for an unknown power id', () => {
		const { ctx, log } = mockCtx();
		drawPowerIcon(ctx, 9999, 5, 5, null);
		expect(log.some((c) => c.op === 'fillText' && c.args[0] === '?')).toBe(true);
	});

	it('drawPowerIcon draws the loaded image instead of the vector fallback', () => {
		const { ctx, log } = mockCtx();
		const image = {} as CanvasImageSource;
		drawPowerIcon(ctx, POWER_BY_KEY.OPERATE_SPAWN.id, 5, 5, 1, { 'operate-spawn': image });
		expect(log.some((c) => c.op === 'drawImage' && c.args[0] === image)).toBe(true);
		expect(log.some((c) => c.op === 'fillText')).toBe(false);
	});
});
