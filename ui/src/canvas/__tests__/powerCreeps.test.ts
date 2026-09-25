import { describe, it, expect } from 'vitest';
import { mockCtx } from './mockCtx';
import { drawPowerCreep, powerCreepTier } from '../powerCreeps';
import { CreepRenderer } from '../creeps';
import { RENDER_COLORS } from '../renderConstants';
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
