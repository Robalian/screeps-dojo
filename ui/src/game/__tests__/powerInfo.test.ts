import { describe, it, expect } from 'vitest';
import { POWERS, POWER_BY_ID, POWER_BY_KEY, powerLevelValue } from '../powerInfo';

describe('powerInfo', () => {
	it('has the 19 operator powers with unique ids and keys', () => {
		expect(POWERS).toHaveLength(19);
		expect(new Set(POWERS.map((p) => p.id)).size).toBe(19);
		expect(POWER_BY_KEY.OPERATE_SPAWN.id).toBe(2);
		expect(POWER_BY_ID[19].key).toBe('OPERATE_FACTORY');
	});

	it('reads per-level values from arrays and scalars', () => {
		expect(powerLevelValue(POWER_BY_KEY.DISRUPT_TERMINAL.ops, 3)).toBe(30);
		expect(powerLevelValue(POWER_BY_KEY.OPERATE_SPAWN.ops, 3)).toBe(100);
		expect(powerLevelValue(undefined, 1)).toBeUndefined();
	});

	it('describes each level in plain English', () => {
		expect(POWER_BY_KEY.OPERATE_SPAWN.describe(3)).toBe('Spawn time −50%');
		expect(POWER_BY_KEY.GENERATE_OPS.describe(5)).toBe('Generates 8 ops');
		expect(POWER_BY_KEY.OPERATE_STORAGE.describe(1)).toBe('Storage capacity +500,000');
		expect(POWER_BY_KEY.REGEN_SOURCE.describe(2)).toBe('+100 energy every 15 ticks');
		expect(POWER_BY_KEY.SHIELD.describe(4)).toBe('Temporary 20,000-hit rampart on its own tile');
		for (const power of POWERS) for (let level = 1; level <= 5; level++) {
			expect(power.describe(level)).not.toMatch(/undefined|NaN/);
		}
	});
});
