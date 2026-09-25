// Pure view model for the power-creep roster editor: no DOM, no React, so it
// is testable without jsdom. It only reads the roster/draft — mutation goes
// through powerRoster.ts's setPowerLevel/addPowerCreep/etc, which the
// component calls directly.
import { POWERS, powerLevelValue } from '../../game/powerInfo';
import { creepLevel, nextLevelBlocker, parseRoster, parseRosterDraft, type PowerCreepRoster, type RosterPowerCreep } from '../../game/powerRoster';

export interface PowerRow {
  key: string; label: string; icon: string; short: string;
  level: number; maxed: boolean; blocker: string | null;
  description: string; costLine: string;
}

function costLine(key: string, level: number): string {
  const power = POWERS.find((p) => p.key === key)!;
  const at = Math.max(1, level);
  const parts: string[] = [];
  const ops = powerLevelValue(power.ops, at);
  if (ops !== undefined) parts.push(ops + ' ops');
  if (power.energy !== undefined) parts.push(power.energy + ' energy');
  parts.push('cooldown ' + power.cooldown);
  if (power.range !== undefined) parts.push('range ' + power.range);
  const duration = powerLevelValue(power.duration, at);
  if (duration !== undefined) parts.push('lasts ' + duration);
  return parts.join(' · ');
}

export function rosterView(roster: PowerCreepRoster, index: number): PowerRow[] {
  const pc = roster.powerCreeps[index];
  return POWERS.map((power) => {
    const level = pc.powers[power.key] || 0;
    const now = level > 0 ? 'L' + level + ': ' + power.describe(level) : 'not learned';
    const next = level < 5 ? ' · next L' + (level + 1) + ': ' + power.describe(level + 1) : '';
    return {
      key: power.key, label: power.label, icon: power.icon, short: power.short,
      level, maxed: level >= 5, blocker: nextLevelBlocker(pc, power.key),
      description: now + next, costLine: costLine(power.key, level),
    };
  });
}

// One line for the scenario ⚙ row.
export function rosterSummary(text: string): string {
  if (rosterHasErrors(text)) return 'power-creeps.json has errors';
  const roster = parseRosterDraft(text).draft!;
  if (roster.powerCreeps.length === 0) return 'No power creeps in this file';
  const creeps = roster.powerCreeps.map((pc) => pc.name + ' (L' + creepLevel(pc) + ')').join(', ');
  const count = roster.powerCreeps.length;
  return count + (count === 1 ? ' power creep: ' : ' power creeps: ') + creeps
    + (roster.gpl !== undefined ? ' · GPL ' + roster.gpl : '');
}

// Save is refused for fatal damage or any validation error; warnings are fine.
// This must use the runner's own parseRoster (not the lenient parseRosterDraft,
// which silently drops malformed fields like gpl: null/"8" or a string power
// level) or Save would enable on a draft the runner then rejects.
export function rosterHasErrors(text: string): boolean {
  return parseRoster(text).issues.some((issue) => issue.severity === 'error');
}

// GPL input parsing: '' means "auto" (gpl: undefined). Any other text that
// doesn't parse to a finite number (a bare '-' mid-typing, or other stray
// input) must not reach the draft at all — Number(...) on it is NaN, and
// JSON.stringify(NaN) writes "gpl":null, which the runner then rejects. null
// here means "ignore this change, leave the field text alone" — it is not the
// same as { gpl: undefined }, which means "set to auto".
export function parseGplInput(value: string): { gpl: number | undefined } | null {
  if (value === '') return { gpl: undefined };
  const n = Number(value);
  return Number.isFinite(n) ? { gpl: n } : null;
}

export function summaryLine(pc: RosterPowerCreep): string {
  const count = Object.keys(pc.powers).length;
  return pc.className + ' · level ' + creepLevel(pc) + ' · ' + count + (count === 1 ? ' power' : ' powers');
}
