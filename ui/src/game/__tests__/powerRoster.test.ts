// ui/src/game/__tests__/powerRoster.test.ts
import { describe, it, expect } from 'vitest';
import {
	parseRoster, validateRoster, creepLevel, requiredGpl, unlockProblem, nextLevelBlocker,
	serializeRoster, toEnginePowers, fromEnginePowers, setPowerLevel, addPowerCreep,
	removePowerCreep, renamePowerCreep, emptyRoster, parseRosterDraft, issuesByPath,
} from '../powerRoster';

const pc = (name: string, powers: Record<string, number>) => ({ name, className: 'operator', powers });

describe('validateRoster', () => {
	it('accepts a normal roster and defaults className', () => {
		const { roster, issues } = validateRoster({ powerCreeps: [{ name: 'PC1', powers: { GENERATE_OPS: 1 } }] });
		expect(issues).toEqual([]);
		expect(roster).toEqual({ powerCreeps: [pc('PC1', { GENERATE_OPS: 1 })] });
	});

	it('rejects structural problems with a path', () => {
		const cases: Array<[unknown, string]> = [
			[[], ''],
			[{ powerCreeps: {} }, 'powerCreeps'],
			[{ powerCreeps: [{ name: '' , powers: {} }] }, 'powerCreeps[0].name'],
			[{ powerCreeps: [pc('A', {}), pc('A', {})] }, 'powerCreeps[1].name'],
			[{ powerCreeps: [{ name: 'A', className: 'commander', powers: {} }] }, 'powerCreeps[0].className'],
			[{ powerCreeps: [pc('A', { OPERATE_SPAWNN: 1 })] }, 'powerCreeps[0].powers.OPERATE_SPAWNN'],
			[{ powerCreeps: [pc('A', { OPERATE_SPAWN: 6 })] }, 'powerCreeps[0].powers.OPERATE_SPAWN'],
			[{ powerCreeps: [pc('A', { OPERATE_SPAWN: 1.5 })] }, 'powerCreeps[0].powers.OPERATE_SPAWN'],
			[{ gpl: -1, powerCreeps: [] }, 'gpl'],
			[{ powerCreeps: [{ name: 'x'.repeat(51), powers: {} }] }, 'powerCreeps[0].name'],
			// prototype keys must not pass as powers (a plain-object lookup would say they exist)
			[{ powerCreeps: [pc('A', { constructor: 1 })] }, 'powerCreeps[0].powers.constructor'],
			[{ powerCreeps: [pc('A', { toString: 1 })] }, 'powerCreeps[0].powers.toString'],
		];
		for (const [raw, path] of cases) {
			const { roster, issues } = validateRoster(raw);
			expect(roster, JSON.stringify(raw)).toBeNull();
			expect(issues.some((i) => i.severity === 'error' && i.path === path), JSON.stringify(issues)).toBe(true);
		}
	});

	it('rejects a total level above 25', () => {
		const powers = { GENERATE_OPS: 5, OPERATE_SPAWN: 5, OPERATE_TOWER: 5, OPERATE_LAB: 5, OPERATE_EXTENSION: 5, SHIELD: 1 };
		expect(validateRoster({ powerCreeps: [pc('A', powers)] }).roster).toBeNull();
	});

	it('warns (not errors) on an unreachable upgrade order and low gpl', () => {
		// 5 levels: the greedy order reaches level 4 before OPERATE_SPAWN L3, which needs 7
		const { roster, issues } = validateRoster({ gpl: 1, powerCreeps: [pc('A', { GENERATE_OPS: 2, OPERATE_SPAWN: 3 })] });
		expect(roster).not.toBeNull();
		expect(issues.map((i) => i.severity)).toEqual(['warning', 'warning']);
		expect(issues[0].message).toMatch(/Operate Spawn level 3 needs the creep at level 7/);
		expect(issues[1].path).toBe('gpl');
	});
});

describe('levels', () => {
	it('derives level, required GPL and unlock problems', () => {
		const a = pc('A', { GENERATE_OPS: 2, OPERATE_SPAWN: 1 });
		expect(creepLevel(a)).toBe(3);
		expect(requiredGpl({ powerCreeps: [a, pc('B', {})] })).toBe(5); // 2 creeps + 3 levels
		expect(unlockProblem(a)).toBeNull();
		// 23 levels, reachable: only ONE power can reach L5 (every L5 needs creep level 22)
		const late = pc('L', { GENERATE_OPS: 5, OPERATE_SPAWN: 4, OPERATE_TOWER: 4, OPERATE_LAB: 4, OPERATE_EXTENSION: 4, OPERATE_STORAGE: 2 });
		expect(unlockProblem(late)).toBeNull();
		// two powers at L5 is impossible: the second L5 needs 22 levels before it
		expect(unlockProblem(pc('X', { GENERATE_OPS: 5, OPERATE_SPAWN: 5, OPERATE_TOWER: 5, OPERATE_LAB: 5, OPERATE_EXTENSION: 3 })))
			.toMatch(/level 5 needs the creep at level 22/);
		expect(unlockProblem(pc('R', { REGEN_SOURCE: 1 }))).toMatch(/Regen Source level 1 needs the creep at level 10/);
	});

	it('explains why the next level of a power is locked', () => {
		expect(nextLevelBlocker(pc('A', { GENERATE_OPS: 1 }), 'GENERATE_OPS')).toBe('needs PC level 2');
		expect(nextLevelBlocker(pc('A', { GENERATE_OPS: 1, OPERATE_SPAWN: 1 }), 'GENERATE_OPS')).toBeNull();
		expect(nextLevelBlocker(pc('A', { GENERATE_OPS: 5 }), 'GENERATE_OPS')).toBe('max level');
	});
});

describe('conversion and editing', () => {
	it('round-trips engine power maps', () => {
		expect(toEnginePowers({ OPERATE_SPAWN: 2, GENERATE_OPS: 1 })).toEqual({ 1: { level: 1 }, 2: { level: 2 } });
		expect(fromEnginePowers({ 2: { level: 2 }, 99: { level: 1 } })).toEqual({ OPERATE_SPAWN: 2 });
	});

	it('serializes with tabs and a trailing newline, powers in id order', () => {
		const text = serializeRoster({ gpl: 3, powerCreeps: [pc('A', { OPERATE_SPAWN: 1, GENERATE_OPS: 1 })] });
		expect(text.endsWith('\n')).toBe(true);
		expect(text).toContain('\t"gpl": 3');
		expect(text.indexOf('GENERATE_OPS')).toBeLessThan(text.indexOf('OPERATE_SPAWN'));
		expect(parseRoster(text).roster).toEqual({ gpl: 3, powerCreeps: [pc('A', { GENERATE_OPS: 1, OPERATE_SPAWN: 1 })] });
	});

	it('reports JSON syntax errors at the root', () => {
		const { roster, issues } = parseRoster('{ "powerCreeps": [ }');
		expect(roster).toBeNull();
		expect(issues[0]).toMatchObject({ severity: 'error', path: '' });
	});

	it('edits immutably; level 0 removes the power', () => {
		const start = { powerCreeps: [pc('A', { GENERATE_OPS: 1 })] };
		const up = setPowerLevel(start, 0, 'OPERATE_SPAWN', 1);
		expect(start.powerCreeps[0].powers).toEqual({ GENERATE_OPS: 1 });
		expect(up.powerCreeps[0].powers).toEqual({ GENERATE_OPS: 1, OPERATE_SPAWN: 1 });
		expect(setPowerLevel(up, 0, 'GENERATE_OPS', 0).powerCreeps[0].powers).toEqual({ OPERATE_SPAWN: 1 });
		const two = addPowerCreep(up);
		expect(two.powerCreeps[1].name).toBe('PC2');
		expect(renamePowerCreep(two, 1, 'Ops').powerCreeps[1].name).toBe('Ops');
		expect(removePowerCreep(two, 0).powerCreeps.map((p) => p.name)).toEqual(['PC2']);
		expect(emptyRoster()).toEqual({ powerCreeps: [] });
	});
});

describe('draft parsing for the form', () => {
	it('keeps field-level mistakes editable', () => {
		const { draft, fatal } = parseRosterDraft('{"gpl":-1,"powerCreeps":[{"name":"","powers":{"GENERATE_OPS":1,"TYPO":2}},{"name":"A"},{"name":"A","powers":{}}]}');
		expect(fatal).toBeNull();
		expect(draft!.powerCreeps.map((p) => p.name)).toEqual(['', 'A', 'A']);
		expect(draft!.powerCreeps[0].powers).toEqual({ GENERATE_OPS: 1, TYPO: 2 });
		expect(draft!.gpl).toBe(-1);
		const byPath = issuesByPath(validateRoster(draft).issues);
		expect(Object.keys(byPath).sort()).toEqual(['gpl', 'powerCreeps[0].name', 'powerCreeps[0].powers.TYPO', 'powerCreeps[2].name']);
	});

	it('is fatal only for damage the form cannot show', () => {
		expect(parseRosterDraft('{').fatal).toMatch(/invalid JSON/);
		expect(parseRosterDraft('[]').fatal).toBe('expected a JSON object');
		expect(parseRosterDraft('{"powerCreeps":{}}').fatal).toBe('"powerCreeps" must be an array');
		expect(parseRosterDraft('{"powerCreeps":[3]}').fatal).toBe('powerCreeps[0] is not an object');
	});

	it('serializes unknown power keys after the known ones instead of dropping them', () => {
		const text = serializeRoster({ powerCreeps: [{ name: 'A', className: 'operator', powers: { TYPO: 1, GENERATE_OPS: 1 } }] });
		expect(text.indexOf('GENERATE_OPS')).toBeLessThan(text.indexOf('TYPO'));
	});
});
