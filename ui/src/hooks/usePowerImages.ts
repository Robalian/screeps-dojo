import { useEffect, useState } from 'react';
import { loadBrowserPowerImages } from '../canvas/browserPowerImages';
import type { PowerImages } from '../canvas/powerImages';

// Official power icons (see canvas/powerImages.ts). Returns an empty object
// until it resolves, never null: nothing here blocks a first paint — every
// drawing routine and this editor's row both fall back to vectors/pills.
export function usePowerImages(): PowerImages {
	const [powerImages, setPowerImages] = useState<PowerImages>({});

	useEffect(() => {
		let cancelled = false;
		loadBrowserPowerImages().then((images) => {
			if (!cancelled) setPowerImages(images);
		}).catch((error) => {
			console.error(error);
		});
		return () => { cancelled = true; };
	}, []);

	return powerImages;
}
