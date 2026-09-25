import { describe, it, expect } from 'vitest';
import { mockCtx } from './mockCtx';
import { RENDER_COLORS } from '../renderConstants';
import { activeEffects, drawEffectFlares, drawEffectPips } from '../powerEffects';
import type { ActiveEffect } from '../powerEffects';
import type { FrameObject } from '../../api/types';

const tower = (effects: unknown[]) => ({ _id: 't', type: 'tower', room: 'W0N0', x: 5, y: 5, effects }) as FrameObject;

describe('activeEffects', () => {
	it('drops expired entries the engine never prunes', () => {
		const o = tower([{ effect: 3, power: 3, level: 1, endTime: 100 }, { effect: 2, power: 2, level: 1, endTime: 101 }]);
		expect(activeEffects(o, 100).map((e) => e.power)).toEqual([2]);
	});

	it('reads the SHIELD rampart entry that has no `effect` field', () => {
		const rampart = { _id: 'r', type: 'rampart', room: 'W0N0', x: 1, y: 1, hits: 5000, hitsMax: 0,
			effects: [{ power: 12, level: 1, endTime: 60 }] } as FrameObject;
		expect(activeEffects(rampart, 10)).toEqual([{ power: 12, level: 1, endTime: 60 }]);
	});

	it('ignores NPC effects on the canvas and returns the shared empty array', () => {
		const core = tower([{ effect: 1001, endTime: 500 }]);
		const a = activeEffects(core, 1);
		expect(a).toEqual([]);
		expect(activeEffects(tower([]), 1)).toBe(activeEffects({ _id: 'x', type: 'x', room: 'W0N0', x: 0, y: 0 } as FrameObject, 1));
	});

	it('reads the index-keyed object shape a real replay carries (Ruling F)', () => {
		const o = { _id: 't2', type: 'tower', room: 'W0N0', x: 5, y: 5,
			effects: { '0': { effect: 3, power: 3, level: 1, endTime: 100 } } } as unknown as FrameObject;
		expect(activeEffects(o, 10)).toEqual([{ power: 3, level: 1, endTime: 100 }]);
	});
});

// drawEffectFlares/drawEffectPips take the already-computed `effects` array
// (the caller, drawFrame.ts, calls activeEffects() once and shares the
// result between both passes rather than each pass recomputing it) — so
// these tests build the ActiveEffect[] themselves rather than passing an
// object + gameTime through to a second activeEffects() call.
describe('effect flares and pips', () => {
	it('draw nothing when given no live effects', () => {
		const { ctx, log } = mockCtx();
		const expired = activeEffects(tower([{ power: 3, level: 1, endTime: 5 }]), 10);
		drawEffectFlares(ctx, expired, 5, 5, 10, null);
		drawEffectPips(ctx, expired, 5, 5);
		expect(log).toHaveLength(0);
	});

	it('draw the flare, and a dark pip with the power code', () => {
		const { ctx, log } = mockCtx();
		const live = activeEffects(tower([{ effect: 3, power: 3, level: 2, endTime: 50 }]), 10);
		drawEffectFlares(ctx, live, 5, 5, 10, null);
		expect(log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.effectFlare)).toBe(true);
		drawEffectPips(ctx, live, 5, 5);
		expect(log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.dark)).toBe(true);
		expect(log.some((c) => c.op === 'fillText' && c.args[0] === 'OT')).toBe(true);
	});

	it('draws pips straight from a hand-built effects array, with no activeEffects/object involved at all', () => {
		const { ctx, log } = mockCtx();
		const effects: ActiveEffect[] = [{ power: 3, level: 2, endTime: 50 }];
		drawEffectPips(ctx, effects, 5, 5);
		expect(log.some((c) => c.op === 'fillText' && c.args[0] === 'OT')).toBe(true);
	});
});
