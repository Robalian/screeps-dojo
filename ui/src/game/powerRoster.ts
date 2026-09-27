// ui/src/game/powerRoster.ts
// The power-creep roster file (power-creeps.json): parse, validate, edit,
// serialize. The ONLY validator — Settings imports it directly and the Node
// backend loads this same file via import() (src/powerCreeps.js), so it must
// stay erasable syntax with .ts import suffixes.
import { POWER_BY_ID, POWER_BY_KEY, POWER_CREEP_MAX_LEVEL, POWER_MAX_LEVEL, POWERS } from './powerInfo.ts';

// Re-exported so the backend's single import() of this file (src/powerCreeps.js)
// also gets the power table (addPowerCreep maps cooldown names to ids with it).
export { POWER_BY_KEY } from './powerInfo.ts';

export interface RosterPowerCreep { name: string; className: string; powers: Record<string, number>; }
export interface PowerCreepRoster { gpl?: number; powerCreeps: RosterPowerCreep[]; }
export interface RosterIssue { severity: 'error' | 'warning'; path: string; message: string; }

const CLASSES = ['operator'];
// The game API accepts 100, but the engine's createPowerCreep.js keeps only
// substring(0, 50) — a longer name could never exist live.
const MAX_NAME_LENGTH = 50;

// POWER_BY_KEY is a plain object: 'constructor' / 'toString' would look like
// powers to a bare lookup and then crash on power.level[...].
const isPowerKey = (key: string): boolean => Object.prototype.hasOwnProperty.call(POWER_BY_KEY, key);

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);
const isLevel = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= POWER_MAX_LEVEL;

export function creepLevel(pc: RosterPowerCreep): number {
	let level = 0;
	for (const key of Object.keys(pc.powers)) level += pc.powers[key];
	return level;
}

export function requiredGpl(roster: PowerCreepRoster): number {
	let needed = 0;
	for (const pc of roster.powerCreeps) needed += 1 + creepLevel(pc);
	return needed;
}

// The engine refuses upgrade(power) to level k+1 unless the creep's CURRENT
// level is >= POWER_INFO.level[k]. Some order of upgrades exists iff, sorting
// every single-level requirement ascending, requirement i is <= i (greedy).
export function unlockProblem(pc: RosterPowerCreep): string | null {
	const steps: Array<{ need: number; label: string; level: number }> = [];
	for (const key of Object.keys(pc.powers)) {
		if (!isPowerKey(key)) continue;
		const power = POWER_BY_KEY[key];
		for (let level = 1; level <= pc.powers[key]; level++) {
			steps.push({ need: power.level[level - 1], label: power.label, level });
		}
	}
	steps.sort((a, b) => a.need - b.need);
	for (let i = 0; i < steps.length; i++) {
		if (steps[i].need > i) {
			return steps[i].label + ' level ' + steps[i].level + ' needs the creep at level ' + steps[i].need
				+ ' before that upgrade, but only ' + i + ' other level(s) come first';
		}
	}
	return null;
}

// Why the + button for `key` is disabled, or null when the next level is fine.
export function nextLevelBlocker(pc: RosterPowerCreep, key: string): string | null {
	if (!isPowerKey(key)) return 'unknown power';
	const power = POWER_BY_KEY[key];
	const current = pc.powers[key] || 0;
	if (current >= POWER_MAX_LEVEL) return 'max level';
	if (creepLevel(pc) >= POWER_CREEP_MAX_LEVEL) return 'creep is at level ' + POWER_CREEP_MAX_LEVEL;
	const need = power.level[current];
	return creepLevel(pc) >= need ? null : 'needs PC level ' + need;
}

export function validateRoster(raw: unknown): { roster: PowerCreepRoster | null; issues: RosterIssue[] } {
	const issues: RosterIssue[] = [];
	const error = (path: string, message: string) => issues.push({ severity: 'error', path, message });
	const warn = (path: string, message: string) => issues.push({ severity: 'warning', path, message });
	if (!isObject(raw)) { error('', 'expected a JSON object'); return { roster: null, issues }; }
	if (!Array.isArray(raw.powerCreeps)) { error('powerCreeps', '"powerCreeps" must be an array'); return { roster: null, issues }; }

	const roster: PowerCreepRoster = { powerCreeps: [] };
	if (raw.gpl !== undefined) {
		if (typeof raw.gpl !== 'number' || !Number.isInteger(raw.gpl) || raw.gpl < 0) error('gpl', '"gpl" must be a whole number >= 0');
		else roster.gpl = raw.gpl;
	}
	const seen = new Set<string>();
	raw.powerCreeps.forEach((entry, index) => {
		const at = 'powerCreeps[' + index + ']';
		if (!isObject(entry)) { error(at, 'expected an object'); return; }
		const name = typeof entry.name === 'string' ? entry.name : '';
		if (!name) error(at + '.name', 'name is required');
		else if (name.length > MAX_NAME_LENGTH) error(at + '.name', 'name is longer than ' + MAX_NAME_LENGTH + ' characters (the engine truncates it)');
		else if (seen.has(name)) error(at + '.name', 'duplicate name "' + name + '"');
		seen.add(name);
		const className = entry.className === undefined ? 'operator' : entry.className;
		if (typeof className !== 'string' || !CLASSES.includes(className)) {
			error(at + '.className', 'className must be one of: ' + CLASSES.join(', '));
		}
		const powers: Record<string, number> = {};
		if (entry.powers !== undefined && !isObject(entry.powers)) error(at + '.powers', '"powers" must be an object of POWER_NAME -> level');
		const rawPowers = isObject(entry.powers) ? entry.powers : {};
		for (const key of Object.keys(rawPowers)) {
			if (!isPowerKey(key)) { error(at + '.powers.' + key, 'unknown power "' + key + '"'); continue; }
			if (!isLevel(rawPowers[key])) { error(at + '.powers.' + key, 'level must be a whole number 1..' + POWER_MAX_LEVEL); continue; }
			powers[key] = rawPowers[key] as number;
		}
		const pc: RosterPowerCreep = { name, className: String(className), powers };
		if (creepLevel(pc) > POWER_CREEP_MAX_LEVEL) error(at + '.powers', 'total level ' + creepLevel(pc) + ' is above ' + POWER_CREEP_MAX_LEVEL);
		const problem = unlockProblem(pc);
		if (problem) warn(at + '.powers', name + ': not reachable in the real game — ' + problem);
		roster.powerCreeps.push(pc);
	});
	if (roster.gpl !== undefined && roster.gpl < requiredGpl(roster)) {
		warn('gpl', 'GPL ' + roster.gpl + ' is below the ' + requiredGpl(roster)
			+ ' these creeps need (1 per creep + 1 per level); Dojo seeds ' + requiredGpl(roster));
	}
	const failed = issues.some((issue) => issue.severity === 'error');
	return { roster: failed ? null : roster, issues };
}

export function parseRoster(text: string): { roster: PowerCreepRoster | null; issues: RosterIssue[] } {
	let raw: unknown;
	try { raw = JSON.parse(text); } catch (e) {
		return { roster: null, issues: [{ severity: 'error', path: '', message: 'invalid JSON: ' + (e as Error).message }] };
	}
	return validateRoster(raw);
}

// Powers written in engine id order, so a saved file diffs cleanly. Unknown
// keys (a typo mid-edit in the Settings form) are kept, after the known ones,
// so the form never silently deletes what the user typed — validation flags them.
function orderedPowers(powers: Record<string, number>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const power of POWERS) if (powers[power.key]) out[power.key] = powers[power.key];
	for (const key of Object.keys(powers)) if (!isPowerKey(key)) out[key] = powers[key];
	return out;
}

export function serializeRoster(roster: PowerCreepRoster): string {
	const out: Record<string, unknown> = {};
	if (roster.gpl !== undefined) out.gpl = roster.gpl;
	out.powerCreeps = roster.powerCreeps.map((pc) => ({ name: pc.name, className: pc.className, powers: orderedPowers(pc.powers) }));
	return JSON.stringify(out, null, '\t') + '\n';
}

export function toEnginePowers(powers: Record<string, number>): Record<string, { level: number }> {
	const out: Record<string, { level: number }> = {};
	for (const key of Object.keys(powers)) {
		if (isPowerKey(key) && powers[key] > 0) out[POWER_BY_KEY[key].id] = { level: powers[key] };
	}
	return out;
}

export function fromEnginePowers(powers: Record<string, { level?: number }> | undefined): Record<string, number> {
	const out: Record<string, number> = {};
	for (const id of Object.keys(powers || {})) {
		const power = Object.prototype.hasOwnProperty.call(POWER_BY_ID, id) ? POWER_BY_ID[Number(id)] : undefined;
		const level = powers![id] && powers![id].level;
		if (power && typeof level === 'number' && level > 0) out[power.key] = level;
	}
	return orderedPowers(out);
}

// The Settings form edits a DRAFT: a roster with field-level mistakes in it
// (blank name mid-retype, duplicate name mid-rename, unknown power key) must
// stay editable, with the problem shown next to its field. Only damage the
// form cannot represent is fatal: bad JSON, a non-object, a non-array list,
// or a list entry that is not an object.
export function parseRosterDraft(text: string): { draft: PowerCreepRoster | null; fatal: string | null } {
	let raw: unknown;
	try { raw = JSON.parse(text); } catch (e) { return { draft: null, fatal: 'invalid JSON: ' + (e as Error).message }; }
	if (!isObject(raw)) return { draft: null, fatal: 'expected a JSON object' };
	if (!Array.isArray(raw.powerCreeps)) return { draft: null, fatal: '"powerCreeps" must be an array' };
	const draft: PowerCreepRoster = { powerCreeps: [] };
	if (typeof raw.gpl === 'number') draft.gpl = raw.gpl;
	for (let i = 0; i < raw.powerCreeps.length; i++) {
		const entry = raw.powerCreeps[i];
		if (!isObject(entry)) return { draft: null, fatal: 'powerCreeps[' + i + '] is not an object' };
		const powers: Record<string, number> = {};
		if (isObject(entry.powers)) {
			for (const key of Object.keys(entry.powers)) {
				if (typeof entry.powers[key] === 'number') powers[key] = entry.powers[key] as number;
			}
		}
		draft.powerCreeps.push({
			name: typeof entry.name === 'string' ? entry.name : '',
			className: typeof entry.className === 'string' ? entry.className : 'operator',
			powers,
		});
	}
	return { draft, fatal: null };
}

// Issues keyed by their path, for rendering each one next to its field.
export function issuesByPath(issues: RosterIssue[]): Record<string, RosterIssue[]> {
	const out: Record<string, RosterIssue[]> = {};
	for (const issue of issues) (out[issue.path] = out[issue.path] || []).push(issue);
	return out;
}

export function emptyRoster(): PowerCreepRoster { return { powerCreeps: [] }; }

function withCreep(roster: PowerCreepRoster, index: number, change: (pc: RosterPowerCreep) => RosterPowerCreep): PowerCreepRoster {
	return { ...roster, powerCreeps: roster.powerCreeps.map((pc, i) => (i === index ? change(pc) : pc)) };
}

export function setPowerLevel(roster: PowerCreepRoster, index: number, key: string, level: number): PowerCreepRoster {
	return withCreep(roster, index, (pc) => {
		const powers = { ...pc.powers };
		if (level <= 0) delete powers[key]; else powers[key] = Math.min(POWER_MAX_LEVEL, level);
		return { ...pc, powers: orderedPowers(powers) };
	});
}

export function addPowerCreep(roster: PowerCreepRoster): PowerCreepRoster {
	const names = new Set(roster.powerCreeps.map((pc) => pc.name));
	let n = roster.powerCreeps.length + 1;
	while (names.has('PC' + n)) n++;
	return { ...roster, powerCreeps: [...roster.powerCreeps, { name: 'PC' + n, className: 'operator', powers: {} }] };
}

export function removePowerCreep(roster: PowerCreepRoster, index: number): PowerCreepRoster {
	return { ...roster, powerCreeps: roster.powerCreeps.filter((_, i) => i !== index) };
}

export function renamePowerCreep(roster: PowerCreepRoster, index: number, name: string): PowerCreepRoster {
	return withCreep(roster, index, (pc) => ({ ...pc, name }));
}
