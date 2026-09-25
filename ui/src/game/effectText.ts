// Every effect/power an object can carry, in plain English for the inspector.
import { EFFECT_COLLAPSE_TIMER, EFFECT_INVULNERABILITY, POWER_BY_ID, powerLevelValue, effectEntries } from './powerInfo.ts';

export interface EffectLine { key: string; title: string; detail: string; remaining: string; }
export interface PowerLine { key: string; title: string; status: string; detail: string; cost: string; }

const ticks = (n: number): string => n.toLocaleString('en-US') + (n === 1 ? ' tick' : ' ticks');

const NPC_EFFECTS: Record<number, { title: string; detail: string }> = {
	[EFFECT_INVULNERABILITY]: { title: 'Invulnerable', detail: 'Immune to all damage' },
	[EFFECT_COLLAPSE_TIMER]: { title: 'Collapse timer', detail: 'This structure collapses when the timer runs out' },
};

export function describeEffects(effects: unknown, gameTime: number | undefined): EffectLine[] {
	const entries = effectEntries(effects);
	const lines: Array<EffectLine & { left: number; endTime: number }> = [];
	for (const raw of entries) {
		if (!raw || typeof raw !== 'object') continue;
		const entry = raw as { effect?: number; power?: number; level?: number; endTime?: number };
		if (typeof entry.endTime !== 'number') continue;
		const left = typeof gameTime === 'number' ? entry.endTime - gameTime : Infinity;
		if (left <= 0) continue;
		const id = entry.power ?? entry.effect;
		if (typeof id !== 'number') continue;
		const power = POWER_BY_ID[id];
		const npc = NPC_EFFECTS[id];
		const level = typeof entry.level === 'number' ? entry.level : undefined;
		lines.push({
			key: String(id),
			title: power ? power.label + (level ? ' · L' + level : '') : npc ? npc.title : 'Effect ' + id,
			detail: power && level ? power.describe(level) : npc ? npc.detail : '',
			remaining: Number.isFinite(left) ? ticks(left) + ' left' : '',
			left, endTime: entry.endTime,
		});
	}
	// by endTime, not `left`: with no gameTime every `left` is Infinity and
	// Infinity - Infinity is NaN, which makes sort order undefined
	lines.sort((a, b) => a.endTime - b.endTime);
	return lines.map(({ left: _left, endTime: _endTime, ...line }) => line);
}

export function describePowers(powers: unknown, gameTime: number | undefined): PowerLine[] {
	if (!powers || typeof powers !== 'object') return [];
	const out: PowerLine[] = [];
	for (const id of Object.keys(powers).map(Number).sort((a, b) => a - b)) {
		const slot = (powers as Record<number, { level?: number; cooldownTime?: number }>)[id];
		const power = POWER_BY_ID[id];
		if (!power || !slot || !(Number(slot.level) > 0)) continue;
		const level = Number(slot.level);
		const cooling = typeof slot.cooldownTime === 'number' && typeof gameTime === 'number' ? slot.cooldownTime - gameTime : 0;
		const cost: string[] = [];
		const ops = powerLevelValue(power.ops, level);
		if (ops !== undefined) cost.push(ops + ' ops');
		if (power.energy !== undefined) cost.push(power.energy + ' energy');
		cost.push('cooldown ' + power.cooldown);
		cost.push(power.range !== undefined ? 'range ' + power.range : 'self');
		const duration = powerLevelValue(power.duration, level);
		if (duration !== undefined) cost.push('lasts ' + duration);
		out.push({
			key: String(id), title: power.label + ' · L' + level,
			status: cooling > 0 ? 'cooling ' + cooling : 'ready',
			detail: power.describe(level), cost: cost.join(' · '),
		});
	}
	return out;
}
