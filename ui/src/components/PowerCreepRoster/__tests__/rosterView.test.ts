import { describe, it, expect } from 'vitest';
import { rosterView, summaryLine, rosterHasErrors, rosterSummary } from '../rosterView';

const roster = { powerCreeps: [{ name: 'PC1', className: 'operator', powers: { GENERATE_OPS: 1, OPERATE_SPAWN: 1 } }] };

describe('rosterView', () => {
  it('lists all 19 powers with level, blocker and description', () => {
    const rows = rosterView(roster, 0);
    expect(rows).toHaveLength(19);
    const spawn = rows.find((r) => r.key === 'OPERATE_SPAWN')!;
    expect(spawn.level).toBe(1);
    expect(spawn.blocker).toBe(null);          // PC level 2 unlocks power level 2
    expect(spawn.description).toBe('L1: Spawn time −10% · next L2: Spawn time −30%');
    expect(spawn.costLine).toBe('100 ops · cooldown 300 · range 3 · lasts 1000');
    const regen = rows.find((r) => r.key === 'REGEN_SOURCE')!;
    expect(regen.level).toBe(0);
    expect(regen.blocker).toBe('needs PC level 10');
  });

  it('summarises a creep', () => {
    expect(summaryLine(roster.powerCreeps[0])).toBe('operator · level 2 · 2 powers');
  });

  it('tells Settings when the draft cannot be saved', () => {
    expect(rosterHasErrors('{"powerCreeps":[{"name":"A","powers":{}}]}')).toBe(false);
    expect(rosterHasErrors('{"powerCreeps":[{"name":"","powers":{}}]}')).toBe(true);
    expect(rosterHasErrors('{')).toBe(true);
    // warnings alone (unreachable order) never block saving
    expect(rosterHasErrors('{"powerCreeps":[{"name":"R","powers":{"REGEN_SOURCE":1}}]}')).toBe(false);
  });

  it('summarises a roster file for the scenario settings row', () => {
    expect(rosterSummary('{"gpl":7,"powerCreeps":[{"name":"PC1","powers":{"GENERATE_OPS":2,"OPERATE_SPAWN":1}},{"name":"PC2","powers":{}}]}'))
      .toBe('2 power creeps: PC1 (L3), PC2 (L0) · GPL 7');
    expect(rosterSummary('{"powerCreeps":[]}')).toBe('No power creeps in this file');
    expect(rosterSummary('{')).toBe('power-creeps.json has errors');
  });
});
