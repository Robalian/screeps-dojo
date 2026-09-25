import { describe, it, expect } from 'vitest';
import { POWER_CREEP_ART } from '../powerCreepArt';

describe('POWER_CREEP_ART', () => {
  it('has five operator tiers whose red plating grows with level', () => {
    const tiers = POWER_CREEP_ART.operator;
    expect(tiers).toHaveLength(5);
    // degenerate one-vertex path excluded; re-derive if the generator reports otherwise
    expect(tiers.map((t) => t.plates.filter((p) => p.lit).length)).toEqual([0, 1, 4, 5, 7]);
  });

  it('keeps the hull hole and every point inside the 128-unit SVG box', () => {
    for (const tier of POWER_CREEP_ART.operator) {
      expect(tier.plates.some((plate) => plate.subpaths.length === 2)).toBe(true);   // hull with its hole
      for (const plate of tier.plates) for (const sub of plate.subpaths) {
        expect(sub.length % 2).toBe(0);
        expect(sub.length).toBeGreaterThanOrEqual(6);
        for (const v of sub) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(128); }
      }
      expect(tier.disc.r).toBeGreaterThan(20);
    }
  });
});
