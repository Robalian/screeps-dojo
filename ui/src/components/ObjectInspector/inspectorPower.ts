import type { FrameObject } from '../../api/types';

// Power fields the inspector renders itself (Effects / Powers sections and
// schema rows), so the raw catch-all never shows them a second time.
// shard / deleteTime / spawnCooldownTime stay in the catch-all on purpose:
// nothing else renders them, and ObjectInspector promises "nothing hidden".
export const POWER_HANDLED_KEYS = new Set([
  'effects', 'powers', 'className', 'isPowerEnabled',
  'powerCreepId', 'powerCreepName', 'powerCreepTicksToLive', 'powerCreepClassName', 'powerCreepLevel',
  'powerCreepPowers', 'powerCreepSaying',
]);

export function tombstoneTitle(o: FrameObject): string | null {
  if (typeof o.powerCreepName !== 'string') return null;
  return 'power creep ' + o.powerCreepName + ' (' + (o.powerCreepClassName || 'operator') + ', level ' + (o.powerCreepLevel ?? 0) + ')';
}
