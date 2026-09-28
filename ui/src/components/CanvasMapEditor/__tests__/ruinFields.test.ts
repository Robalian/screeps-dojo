import { describe, expect, it } from 'vitest';
import { fieldsFor, fieldValue, withField } from '../objectFields';
import { makeEditableObject, parseEditableMap } from '../mapModel';

// A ruin's "was a" lives in `structure.type` — where the engine writes it
// (processor structures/_destroy.js) and the runtime reads it. It used to be
// edited as a top-level `structureType` nothing reads.
const importedRuin = {
	type: 'ruin', x: 12, y: 37, id: '6ab96336ad3e031a969d1d0c', owner: 'invader',
	structure: { id: '6ab84110c7926d4a99b9cb9b', type: 'rampart', hits: 0, hitsMax: 300000000 },
	store: {}, ticks: { decayTime: 40750, destroyTime: -3337 },
};

describe('ruin fields', () => {
	it('edits structure.type, offering every structure that can leave a ruin', () => {
		const field = fieldsFor(importedRuin, { rcl: 8 }).find((f) => f.label === 'was a')!;
		expect(field.key).toBe('structure.type');
		const values = field.kind === 'select' ? field.options.map((o) => o.value) : [];
		expect(values).toEqual(expect.arrayContaining(['invaderCore', 'powerBank', 'rampart', 'spawn', 'constructedWall']));
		expect(fieldValue(importedRuin, 'structure.type')).toBe('rampart');
	});

	it('keeps an imported type the list does not know selectable', () => {
		const ruin = { ...importedRuin, structure: { type: 'reactor', hits: 0 } };
		const field = fieldsFor(ruin, { rcl: 8 }).find((f) => f.label === 'was a')!;
		expect(field.kind === 'select' && field.options.some((o) => o.value === 'reactor')).toBe(true);
	});

	it('changes the remembered structure in place, with its max hits', () => {
		const next = withField(importedRuin, 'structure.type', 'invaderCore', { rcl: 8 });
		expect(next.structure).toEqual({ id: '6ab84110c7926d4a99b9cb9b', type: 'invaderCore', hits: 0, hitsMax: 100000 });
		expect(next.structureType).toBeUndefined();
		expect(importedRuin.structure.type).toBe('rampart');
	});

	it('gives a new ruin a structure record', () => {
		const ruin = makeEditableObject("ruin", 5, 5);
		expect(ruin.structure).toEqual({ type: 'spawn', hits: 0, hitsMax: 5000 });
	});

	it('moves an old top-level structureType into structure.type', () => {
		const terrain = Array.from({ length: 50 }, () => '.'.repeat(50));
		const parsed = parseEditableMap({ room: 'W1N1', terrain, structures: [{ type: 'ruin', x: 1, y: 1, structureType: 'tower' }] });
		const ruin = parsed.map!.structures[0];
		expect(ruin.structure).toEqual({ type: 'tower' });
		expect(ruin.structureType).toBeUndefined();
	});
});

describe('a ruin with no structure record', () => {
	// The loader makes it a wall (dojoWorld fillRuinStructure); the panel must
	// show that, not the first option.
	it('shows the loader default', () => {
		const field = fieldsFor({ type: 'ruin', x: 1, y: 1 }, { rcl: 8 }).find((f) => f.label === 'was a')!;
		expect(field.kind === 'select' && field.fallback).toBe('constructedWall');
		expect(field.kind === 'select' && field.options.some((o) => o.value === 'constructedWall')).toBe(true);
	});
});
