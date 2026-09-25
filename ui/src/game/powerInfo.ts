// Canonical power-creep power table for the UI, the canvas and (via import())
// the Node backend — so it must stay erasable syntax (no enums) and carry .ts
// import suffixes. Numbers mirror @screeps/common constants POWER_INFO; the
// backend unit test test/unit/powerInfoParity.test.js fails if they drift.

export interface PowerDef {
	id: number;
	key: string;          // PWR_ name without the prefix
	label: string;        // "Operate Spawn"
	short: string;        // 2-3 letter code for tiny pips / fallbacks
	icon: string;         // official renderer texture key, '' when none exists
	level: readonly number[];   // PC level required before upgrading to power level i+1
	range?: number;
	cooldown: number;
	duration?: number | readonly number[];
	ops?: number | readonly number[];
	energy?: number;
	effect?: readonly number[];
	period?: number;
	targets: string;      // plain-English valid targets
	describe: (level: number) => string;
}

export const EFFECT_INVULNERABILITY = 1001;
export const EFFECT_COLLAPSE_TIMER = 1002;
export const POWER_CREEP_MAX_LEVEL = 25;
export const POWER_MAX_LEVEL = 5;

const STANDARD_LEVELS = [0, 2, 7, 14, 22] as const;
const LATE_LEVELS = [10, 11, 12, 14, 22] as const;
const TOP_LEVELS = [20, 21, 22, 23, 24] as const;

export function powerLevelValue<T>(value: T | readonly T[] | undefined, level: number): T | undefined {
	if (value === undefined) return undefined;
	return Array.isArray(value) ? (value as readonly T[])[level - 1] : (value as T);
}

const n = (value: number): string => value.toLocaleString('en-US');
const pct = (fraction: number): string => Math.round(fraction * 100) + '%';
const at = (values: readonly number[], level: number): number => values[level - 1];

const SPAWN_FACTORS = [0.9, 0.7, 0.5, 0.35, 0.2] as const;
const TOWER_UP = [1.1, 1.2, 1.3, 1.4, 1.5] as const;
const DOWN = [0.9, 0.8, 0.7, 0.6, 0.5] as const;

export const POWERS: readonly PowerDef[] = [
	{ id: 1, key: 'GENERATE_OPS', label: 'Generate Ops', short: 'GO', icon: 'generate-ops',
		level: STANDARD_LEVELS, cooldown: 50, effect: [1, 2, 4, 6, 8], targets: 'self',
		describe: (l) => 'Generates ' + at([1, 2, 4, 6, 8], l) + ' ops' },
	{ id: 2, key: 'OPERATE_SPAWN', label: 'Operate Spawn', short: 'OS', icon: 'operate-spawn',
		level: STANDARD_LEVELS, range: 3, cooldown: 300, duration: 1000, ops: 100, effect: SPAWN_FACTORS, targets: 'spawn',
		describe: (l) => 'Spawn time −' + pct(1 - at(SPAWN_FACTORS, l)) },
	{ id: 3, key: 'OPERATE_TOWER', label: 'Operate Tower', short: 'OT', icon: 'operate-tower',
		level: STANDARD_LEVELS, range: 3, cooldown: 10, duration: 100, ops: 10, effect: TOWER_UP, targets: 'tower',
		describe: (l) => 'Tower attack, heal and repair +' + pct(at(TOWER_UP, l) - 1) },
	{ id: 4, key: 'OPERATE_STORAGE', label: 'Operate Storage', short: 'OST', icon: 'operate-storage',
		level: STANDARD_LEVELS, range: 3, cooldown: 800, duration: 1000, ops: 100,
		effect: [500000, 1000000, 2000000, 4000000, 7000000], targets: 'storage',
		describe: (l) => 'Storage capacity +' + n(at([500000, 1000000, 2000000, 4000000, 7000000], l)) },
	{ id: 5, key: 'OPERATE_LAB', label: 'Operate Lab', short: 'OL', icon: 'operate-lab',
		level: STANDARD_LEVELS, range: 3, cooldown: 50, duration: 1000, ops: 10, effect: [2, 4, 6, 8, 10], targets: 'lab',
		describe: (l) => 'Reaction amount +' + at([2, 4, 6, 8, 10], l) + ' per reaction' },
	{ id: 6, key: 'OPERATE_EXTENSION', label: 'Operate Extension', short: 'OE', icon: 'operate-extension',
		level: STANDARD_LEVELS, range: 3, cooldown: 50, ops: 2, effect: [0.2, 0.4, 0.6, 0.8, 1.0],
		targets: 'storage, terminal, factory or container (energy source)',
		describe: (l) => 'Instantly fills ' + pct(at([0.2, 0.4, 0.6, 0.8, 1.0], l)) + ' of the room\'s extensions from the target' },
	{ id: 7, key: 'OPERATE_OBSERVER', label: 'Operate Observer', short: 'OO', icon: 'operate-observer',
		level: STANDARD_LEVELS, range: 3, cooldown: 400, duration: [200, 400, 600, 800, 1000], ops: 10, targets: 'observer',
		describe: (l) => 'Unlimited observer range for ' + n(at([200, 400, 600, 800, 1000], l)) + ' ticks' },
	{ id: 8, key: 'OPERATE_TERMINAL', label: 'Operate Terminal', short: 'OTE', icon: 'operate-terminal',
		level: STANDARD_LEVELS, range: 3, cooldown: 500, duration: 1000, ops: 100, effect: DOWN, targets: 'terminal',
		describe: (l) => 'Terminal energy cost and cooldown −' + pct(1 - at(DOWN, l)) },
	{ id: 9, key: 'DISRUPT_SPAWN', label: 'Disrupt Spawn', short: 'DS', icon: 'disrupt-spawn',
		level: STANDARD_LEVELS, range: 20, cooldown: 5, duration: [1, 2, 3, 4, 5], ops: 10, targets: 'spawn',
		describe: (l) => 'Pauses spawning for ' + l + (l === 1 ? ' tick' : ' ticks') },
	{ id: 10, key: 'DISRUPT_TOWER', label: 'Disrupt Tower', short: 'DT', icon: 'disrupt-tower',
		level: STANDARD_LEVELS, range: 50, cooldown: 0, duration: 5, ops: 10, effect: DOWN, targets: 'tower',
		describe: (l) => 'Tower effectiveness −' + pct(1 - at(DOWN, l)) },
	{ id: 11, key: 'DISRUPT_SOURCE', label: 'Disrupt Source', short: 'DSO', icon: 'disrupt-source',
		level: STANDARD_LEVELS, range: 3, cooldown: 100, duration: [100, 200, 300, 400, 500], ops: 100, targets: 'source',
		describe: (l) => 'Pauses source regeneration for ' + n(at([100, 200, 300, 400, 500], l)) + ' ticks' },
	{ id: 12, key: 'SHIELD', label: 'Shield', short: 'SH', icon: 'shield',
		level: STANDARD_LEVELS, cooldown: 20, duration: 50, energy: 100, effect: [5000, 10000, 15000, 20000, 25000], targets: 'self',
		describe: (l) => 'Temporary ' + n(at([5000, 10000, 15000, 20000, 25000], l)) + '-hit rampart on its own tile' },
	{ id: 13, key: 'REGEN_SOURCE', label: 'Regen Source', short: 'RS', icon: 'regen-source',
		level: LATE_LEVELS, range: 3, cooldown: 100, duration: 300, effect: [50, 100, 150, 200, 250], period: 15, targets: 'source',
		describe: (l) => '+' + at([50, 100, 150, 200, 250], l) + ' energy every 15 ticks' },
	{ id: 14, key: 'REGEN_MINERAL', label: 'Regen Mineral', short: 'RM', icon: 'regen-mineral',
		level: LATE_LEVELS, range: 3, cooldown: 100, duration: 100, effect: [2, 4, 6, 8, 10], period: 10, targets: 'mineral',
		describe: (l) => '+' + at([2, 4, 6, 8, 10], l) + ' minerals every 10 ticks' },
	{ id: 15, key: 'DISRUPT_TERMINAL', label: 'Disrupt Terminal', short: 'DTE', icon: 'disrupt-terminal',
		level: TOP_LEVELS, range: 50, cooldown: 8, duration: 10, ops: [50, 40, 30, 20, 10], targets: 'terminal',
		describe: () => 'Blocks withdrawing from or using the terminal' },
	{ id: 16, key: 'OPERATE_POWER', label: 'Operate Power', short: 'OP', icon: 'operate-power',
		level: LATE_LEVELS, range: 3, cooldown: 800, duration: 1000, ops: 200, effect: [1, 2, 3, 4, 5], targets: 'power spawn',
		describe: (l) => 'Power spawn processes +' + l + ' power per tick' },
	{ id: 17, key: 'FORTIFY', label: 'Fortify', short: 'FO', icon: 'fortify',
		level: STANDARD_LEVELS, range: 3, cooldown: 5, duration: [1, 2, 3, 4, 5], ops: 5, targets: 'rampart or wall',
		describe: () => 'Invulnerable to creep attacks and powers' },
	{ id: 18, key: 'OPERATE_CONTROLLER', label: 'Operate Controller', short: 'OC', icon: 'operate-controller',
		level: TOP_LEVELS, range: 3, cooldown: 800, duration: 1000, ops: 200, effect: [10, 20, 30, 40, 50], targets: 'controller (RCL 8)',
		describe: (l) => 'RCL 8 upgrade limit +' + at([10, 20, 30, 40, 50], l) + ' energy per tick' },
	{ id: 19, key: 'OPERATE_FACTORY', label: 'Operate Factory', short: 'OF', icon: '',
		level: STANDARD_LEVELS, range: 3, cooldown: 800, duration: 1000, ops: 100, targets: 'factory',
		describe: (l) => 'Factory works at level ' + l + ' (sets the level permanently if it has none)' },
];

export const POWER_BY_ID: Readonly<Record<number, PowerDef>> = Object.fromEntries(POWERS.map((p) => [p.id, p]));
export const POWER_BY_KEY: Readonly<Record<string, PowerDef>> = Object.fromEntries(POWERS.map((p) => [p.key, p]));
