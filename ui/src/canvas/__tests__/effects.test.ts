import { describe, expect, it } from 'vitest';
import type { FrameObject, StageLayout } from '../../api/types';
import { POWER_BY_KEY } from '../../game/powerInfo';
import { drawActionEffects, drawHitPointsBar } from '../effects';
import { RENDER_COLORS } from '../renderConstants';
import { mockCtx } from './mockCtx';

describe('canvas effects', () => {
  it('draws a paused attack beam and target ring with the shared attack color', () => {
    const { ctx, log } = mockCtx();
    const object = {
      _id: 'creep', type: 'creep', room: 'W0N0', x: 10, y: 20,
      actionLog: { attack: { x: 12, y: 20 } },
    } as FrameObject;
    const offsets = { W0N0: { col: 0, row: 0 } } as StageLayout['offsets'];

    drawActionEffects(ctx, object, 10, 20, null, offsets, 'W0N0');

    expect(log.some((call) => call.op === 'set:strokeStyle' && call.args[0] === RENDER_COLORS.actions.attack)).toBe(true);
    expect(log.some((call) => call.op === 'moveTo' && call.args[0] === 10.5 && call.args[1] === 20.5)).toBe(true);
    expect(log.some((call) => call.op === 'lineTo' && call.args[0] === 12.5 && call.args[1] === 20.5)).toBe(true);
  });

  it("uses the shared health color for a damaged object's hit-point bar", () => {
    const { ctx, log } = mockCtx();
    const object = { hits: 50, hitsMax: 100 } as FrameObject;

    drawHitPointsBar(ctx, object, 3, 4, 1);

    expect(log.some((call) => call.op === 'set:fillStyle' && call.args[0] === RENDER_COLORS.health)).toBe(true);
  });

  it('draws a red power beam and an icon badge for usePower on another tile', () => {
    const { ctx, log } = mockCtx();
    const object = { _id: 'p', type: 'powerCreep', room: 'W0N0', x: 10, y: 20,
      actionLog: { power: { id: POWER_BY_KEY.OPERATE_TOWER.id, x: 12, y: 20 } } } as FrameObject;
    drawActionEffects(ctx, object, 10, 20, null, { W0N0: { col: 0, row: 0 } }, 'W0N0');
    expect(log.some((c) => c.op === 'set:strokeStyle' && c.args[0] === RENDER_COLORS.powerCreep.beam)).toBe(true);
    expect(log.some((c) => c.op === 'moveTo' && c.args[0] === 10.5 && c.args[1] === 20.5)).toBe(true);
    expect(log.some((c) => c.op === 'fillText' && c.args[0] === 'OT')).toBe(true);   // vector fallback, no images
  });

  it('draws no zero-length beam for a self-targeted power, only the badge', () => {
    const { ctx, log } = mockCtx();
    const object = { _id: 'p', type: 'powerCreep', room: 'W0N0', x: 10, y: 20,
      actionLog: { power: { id: POWER_BY_KEY.GENERATE_OPS.id, x: 10, y: 20 } } } as FrameObject;
    drawActionEffects(ctx, object, 10, 20, null, { W0N0: { col: 0, row: 0 } }, 'W0N0');
    expect(log.filter((c) => c.op === 'lineTo')).toHaveLength(0);
    expect(log.some((c) => c.op === 'fillText' && c.args[0] === 'GO')).toBe(true);
  });

  it('uses the loaded icon image when present', () => {
    const { ctx, log } = mockCtx();
    const image = {} as CanvasImageSource;
    const object = { _id: 'p', type: 'powerCreep', room: 'W0N0', x: 10, y: 20,
      actionLog: { power: { id: POWER_BY_KEY.OPERATE_SPAWN.id, x: 11, y: 20 } } } as FrameObject;
    drawActionEffects(ctx, object, 10, 20, null, { W0N0: { col: 0, row: 0 } }, 'W0N0', { 'operate-spawn': image });
    expect(log.some((c) => c.op === 'drawImage' && c.args[0] === image)).toBe(true);
  });

  it('flashes green on renew and red on spawn', () => {
    const renew = mockCtx();
    drawActionEffects(renew.ctx, { _id: 'p', type: 'powerCreep', room: 'W0N0', x: 3, y: 3, actionLog: { healed: { x: 3, y: 3 } } } as FrameObject,
      3, 3, 0.25, { W0N0: { col: 0, row: 0 } }, 'W0N0');
    expect(renew.log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.renew)).toBe(true);
    const spawn = mockCtx();
    drawActionEffects(spawn.ctx, { _id: 'p', type: 'powerCreep', room: 'W0N0', x: 3, y: 3, actionLog: { spawned: true } } as FrameObject,
      3, 3, 0.25, { W0N0: { col: 0, row: 0 } }, 'W0N0');
    expect(spawn.log.some((c) => c.op === 'set:fillStyle' && c.args[0] === RENDER_COLORS.powerCreep.spawnFlare)).toBe(true);
  });
});
