// GENERATED FILE - do not edit by hand.
// Produced by scripts/extractPowerArt.cjs from screeps/renderer@a2db4a76bb8f4c70e0c2a9e3b7d22a35a8c6b504
// (metadata/images/operator-lvl0.svg .. operator-lvl4.svg), which is ISC
// licensed:
//
// Copyright (c) 2016, Artem Chivchalov <contact@screeps.com>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// See ui/src/assets/screeps-renderer/LICENSE for the full notice.

// One plate of the operator power creep's body art, filled with the
// 'evenodd' rule so a compound path with a hole (the hexagonal hull) keeps
// its hole. Coordinates are in the source SVG's 128x128 box.
export interface PowerCreepArtPlate {
	subpaths: number[][];
	// White in the source SVG; the renderer tints lit plates red.
	lit: boolean;
}

export interface PowerCreepArtTier {
	plates: PowerCreepArtPlate[];
	disc: { cx: number; cy: number; r: number };
}

// Indexed by power creep level, tiers 0-4.
export const POWER_CREEP_ART: Record<'operator', PowerCreepArtTier[]> = {
	operator: [
		{
			plates: [
				{ subpaths: [[89.9, 16.9, 38.3, 16.9, 12.6, 61.5, 41.6, 95.3, 85.6, 96.7, 115.6, 61.4], [87.7, 84.5, 40.5, 84.5, 17, 59.1, 40.5, 23.4, 87.6, 23.4, 111.1, 59.1]], lit: false },
				{ subpaths: [[35.8, 104.2, 12.6, 74, 12.6, 66.9, 37.5, 95.5]], lit: false },
				{ subpaths: [[41.8, 100.5, 52, 108.5, 54.4, 117.5, 40.2, 109.3]], lit: false },
				{ subpaths: [[40.6, 9.6, 40.6, 16.8, 50.7, 37.8, 60.1, 37.8, 60.1, 39.4, 68, 39.4, 68, 37.8, 77.4, 37.8, 87.5, 16.8, 87.5, 9.6]], lit: false },
				{ subpaths: [[92.2, 104.2, 115.4, 74, 115.4, 66.9, 90.6, 95.5]], lit: false },
				{ subpaths: [[86.2, 100.5, 76.1, 108.5, 73.6, 117.5, 87.9, 109.3]], lit: false },
				{ subpaths: [[69.8, 108.6, 65.9, 108.6, 62.2, 108.6, 58.2, 108.6, 60.6, 118.4, 64, 116.2, 67.4, 118.4]], lit: false }
			],
			disc: { cx: 64, cy: 76, r: 28.6 }
		},
		{
			plates: [
				{ subpaths: [[89.9, 16.9, 38.3, 16.9, 12.6, 61.5, 41.6, 95.3, 85.6, 96.7, 115.6, 61.4], [87.7, 84.5, 40.5, 84.5, 17, 59.1, 40.5, 23.4, 87.6, 23.4, 111.1, 59.1]], lit: false },
				{ subpaths: [[35.8, 104.2, 12.6, 74, 12.6, 66.9, 37.5, 95.5]], lit: false },
				{ subpaths: [[41.8, 100.5, 52, 108.5, 54.4, 117.5, 40.2, 109.3]], lit: false },
				{ subpaths: [[40.6, 9.6, 40.6, 16.8, 50.7, 37.8, 60.1, 37.8, 60.1, 39.4, 68, 39.4, 68, 37.8, 77.4, 37.8, 87.5, 16.8, 87.5, 9.6]], lit: true },
				{ subpaths: [[92.2, 104.2, 115.4, 74, 115.4, 66.9, 90.6, 95.5]], lit: false },
				{ subpaths: [[86.2, 100.5, 76.1, 108.5, 73.6, 117.5, 87.9, 109.3]], lit: false },
				{ subpaths: [[69.8, 108.6, 65.9, 108.6, 62.2, 108.6, 58.2, 108.6, 60.6, 118.4, 64, 116.2, 67.4, 118.4]], lit: false }
			],
			disc: { cx: 64, cy: 76, r: 28.6 }
		},
		{
			plates: [
				{ subpaths: [[89.9, 16.9, 38.3, 16.9, 12.6, 61.5, 41.6, 95.3, 85.6, 96.7, 115.6, 61.4], [87.7, 84.5, 40.5, 84.5, 17, 59.1, 40.5, 23.4, 87.6, 23.4, 111.1, 59.1]], lit: false },
				{ subpaths: [[35.8, 104.2, 12.6, 74, 12.6, 66.9, 37.5, 95.5]], lit: false },
				{ subpaths: [[41.8, 100.5, 52, 108.5, 54.4, 117.5, 40.2, 109.3]], lit: true },
				{ subpaths: [[40.6, 9.6, 40.6, 16.8, 50.7, 37.8, 60.1, 37.8, 60.1, 39.4, 68, 39.4, 68, 37.8, 77.4, 37.8, 87.5, 16.8, 87.5, 9.6]], lit: true },
				{ subpaths: [[92.2, 104.2, 115.4, 74, 115.4, 66.9, 90.6, 95.5]], lit: false },
				{ subpaths: [[86.2, 100.5, 76.1, 108.5, 73.6, 117.5, 87.9, 109.3]], lit: true },
				{ subpaths: [[69.8, 108.6, 65.9, 108.6, 62.2, 108.6, 58.2, 108.6, 60.6, 118.4, 64, 116.2, 67.4, 118.4]], lit: true }
			],
			disc: { cx: 64, cy: 76, r: 28.6 }
		},
		{
			plates: [
				{ subpaths: [[89.9, 16.9, 38.3, 16.9, 12.6, 61.5, 41.6, 95.3, 85.6, 96.7, 115.6, 61.4], [87.7, 84.5, 40.5, 84.5, 17, 59.1, 40.5, 23.4, 87.6, 23.4, 111.1, 59.1]], lit: true },
				{ subpaths: [[35.8, 104.2, 12.6, 74, 12.6, 66.9, 37.5, 95.5]], lit: false },
				{ subpaths: [[41.8, 100.5, 52, 108.5, 54.4, 117.5, 40.2, 109.3]], lit: true },
				{ subpaths: [[40.6, 9.6, 40.6, 16.8, 50.7, 37.8, 60.1, 37.8, 60.1, 39.4, 68, 39.4, 68, 37.8, 77.4, 37.8, 87.5, 16.8, 87.5, 9.6]], lit: true },
				{ subpaths: [[92.2, 104.2, 115.4, 74, 115.4, 66.9, 90.6, 95.5]], lit: false },
				{ subpaths: [[86.2, 100.5, 76.1, 108.5, 73.6, 117.5, 87.9, 109.3]], lit: true },
				{ subpaths: [[69.8, 108.6, 65.9, 108.6, 62.2, 108.6, 58.2, 108.6, 60.6, 118.4, 64, 116.2, 67.4, 118.4]], lit: true }
			],
			disc: { cx: 64, cy: 76, r: 28.6 }
		},
		{
			plates: [
				{ subpaths: [[89.9, 16.9, 38.3, 16.9, 12.6, 61.5, 41.6, 95.3, 85.6, 96.7, 115.6, 61.4], [87.7, 84.5, 40.5, 84.5, 17, 59.1, 40.5, 23.4, 87.6, 23.4, 111.1, 59.1]], lit: true },
				{ subpaths: [[35.8, 104.2, 12.6, 74, 12.6, 66.9, 37.5, 95.5]], lit: true },
				{ subpaths: [[41.8, 100.5, 52, 108.5, 54.4, 117.5, 40.2, 109.3]], lit: true },
				{ subpaths: [[40.6, 9.6, 40.6, 16.8, 50.7, 37.8, 60.1, 37.8, 60.1, 39.4, 68, 39.4, 68, 37.8, 77.4, 37.8, 87.5, 16.8, 87.5, 9.6]], lit: true },
				{ subpaths: [[92.2, 104.2, 115.4, 74, 115.4, 66.9, 90.6, 95.5]], lit: true },
				{ subpaths: [[86.2, 100.5, 76.1, 108.5, 73.6, 117.5, 87.9, 109.3]], lit: true },
				{ subpaths: [[69.8, 108.6, 65.9, 108.6, 62.2, 108.6, 58.2, 108.6, 60.6, 118.4, 64, 116.2, 67.4, 118.4]], lit: true }
			],
			disc: { cx: 64, cy: 76, r: 28.6 }
		}
	]
};
