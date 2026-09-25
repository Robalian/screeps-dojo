import { describe, it, expect } from 'vitest';
import { TYPE_SCHEMA } from '../inspectorSchema';
import { POWER_HANDLED_KEYS, tombstoneTitle } from '../inspectorPower';
import type { FrameObject } from '../../../api/types';

const value = (type: string, label: string, o: Partial<FrameObject>, gt = 1000) =>
  TYPE_SCHEMA[type].stats.find((s) => s.label === label)!.value({ _id: 'x', type, room: 'W0N0', x: 0, y: 0, ...o } as FrameObject, gt);

describe('power rows in the inspector schema', () => {
  it('shows class, level and ops for a power creep', () => {
    expect(value('powerCreep', 'class', { className: 'operator', level: 12 })).toBe('operator · level 12');
    expect(value('powerCreep', 'ops', { store: { ops: 40 }, storeCapacity: 1300 })).toBe('40 / 1,300');
  });

  it('marks a power-enabled controller, and stays silent otherwise', () => {
    expect(value('controller', 'powers enabled', { isPowerEnabled: true })).toBe('yes');
    // null hides the row: "no" on every controller in every replay is noise
    expect(value('controller', 'powers enabled', {})).toBeNull();
  });

  it('names a power creep tombstone', () => {
    expect(tombstoneTitle({ powerCreepName: 'PC1', powerCreepClassName: 'operator', powerCreepLevel: 12 } as unknown as FrameObject))
      .toBe('power creep PC1 (operator, level 12)');
    expect(tombstoneTitle({} as FrameObject)).toBeNull();
  });

  it('hides raw power fields from the catch-all', () => {
    for (const k of ['effects', 'powers', 'className', 'isPowerEnabled', 'powerCreepPowers']) expect(POWER_HANDLED_KEYS.has(k)).toBe(true);
  });
});
