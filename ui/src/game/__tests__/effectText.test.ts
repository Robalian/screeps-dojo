import { describe, it, expect } from 'vitest';
import { describeEffects, describePowers } from '../effectText.ts';

describe('describeEffects', () => {
  it('explains each active power effect with its level and time left', () => {
    const lines = describeEffects([
      { effect: 2, power: 2, level: 3, endTime: 1412 },
      { effect: 17, power: 17, level: 2, endTime: 1001 },
      { effect: 3, power: 3, level: 1, endTime: 900 },          // expired
    ], 1000);
    expect(lines).toEqual([
      { key: '17', title: 'Fortify · L2', detail: 'Invulnerable to creep attacks and powers', remaining: '1 tick left' },
      { key: '2', title: 'Operate Spawn · L3', detail: 'Spawn time −50%', remaining: '412 ticks left' },
    ]);
  });

  it('covers NPC effects and SHIELD', () => {
    expect(describeEffects([{ effect: 1001, endTime: 1187 }], 1000)[0])
      .toMatchObject({ title: 'Invulnerable', detail: 'Immune to all damage', remaining: '187 ticks left' });
    expect(describeEffects([{ effect: 1002, endTime: 37000 }], 1000)[0])
      .toMatchObject({ title: 'Collapse timer', detail: 'This structure collapses when the timer runs out', remaining: '36,000 ticks left' });
    expect(describeEffects([{ power: 12, level: 1, endTime: 1050 }], 1000)[0])
      .toMatchObject({ title: 'Shield · L1', detail: 'Temporary 5,000-hit rampart on its own tile', remaining: '50 ticks left' });
  });

  it('shows unknown ids plainly and survives junk', () => {
    expect(describeEffects([{ effect: 1234, endTime: 1050 }], 1000)[0].title).toBe('Effect 1234');
    expect(describeEffects(null, 1000)).toEqual([]);
    expect(describeEffects([{ power: 2, level: 1 }], 1000)).toEqual([]);
    expect(describeEffects([{ power: 2, level: 1, endTime: 1100 }], undefined)[0].remaining).toBe('');
  });

  it('handles effects as an object with index keys (ruling F)', () => {
    const lines = describeEffects({ 0: { effect: 2, power: 2, level: 3, endTime: 1412 } }, 1000);
    expect(lines).toEqual([
      { key: '2', title: 'Operate Spawn · L3', detail: 'Spawn time −50%', remaining: '412 ticks left' },
    ]);
  });
});

describe('describePowers', () => {
  it('lists learned powers with cooldown status and costs', () => {
    const lines = describePowers({ 2: { level: 3, cooldownTime: 1212 }, 1: { level: 1 } }, 1000);
    expect(lines).toEqual([
      { key: '1', title: 'Generate Ops · L1', status: 'ready', detail: 'Generates 1 ops', cost: 'cooldown 50 · self' },
      { key: '2', title: 'Operate Spawn · L3', status: 'cooling 212', detail: 'Spawn time −50%', cost: '100 ops · cooldown 300 · range 3 · lasts 1000' },
    ]);
  });
});
