// Official power icons, vendored from screeps/renderer (ISC) — see
// ui/src/assets/screeps-renderer/README.md. Browser-only file, never loaded
// by Node: it uses Vite's glob import, which videoRenderer.js's plain
// loadImage-off-disk loadPowerImages() has no equivalent of.
import type { PowerImages } from './powerImages.ts';

const urls = import.meta.glob('../assets/screeps-renderer/powers/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

// icon texture key ('generate-ops', …) -> the PNG's built URL.
export const POWER_ICON_URLS: Record<string, string> = Object.fromEntries(
	Object.entries(urls).map(([filePath, url]) => [filePath.split('/').pop()!.replace('.png', ''), url]));

let promise: Promise<PowerImages> | null = null;

// Decoded once and shared. Cheap: 18 small PNGs, and every drawing routine
// has a vector fallback if one fails to load.
export function loadBrowserPowerImages(): Promise<PowerImages> {
	if (!promise) {
		promise = Promise.all(Object.entries(POWER_ICON_URLS).map(([key, url]) => new Promise<[string, HTMLImageElement | undefined]>((resolve) => {
			const image = new Image();
			image.onload = () => resolve([key, image]);
			// A missing icon must never break rendering: resolve, not reject.
			image.onerror = () => resolve([key, undefined]);
			image.src = url;
		}))).then((entries) => Object.fromEntries(entries));
	}
	return promise;
}
