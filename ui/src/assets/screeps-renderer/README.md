# Power creep art, vendored from the official Screeps renderer

`powers/*.png` (18 files, rasterised at 128x128) and the operator body plate
polygons baked into `ui/src/canvas/powerCreepArt.ts` come from:

    https://github.com/screeps/renderer
    a2db4a76bb8f4c70e0c2a9e3b7d22a35a8c6b504   (metadata/images/)

ISC licensed — see `LICENSE` in this directory, copied verbatim from that
repository's `LICENSE.txt`.

## What came from where

- `metadata/images/operator-lvl0.svg` .. `operator-lvl4.svg` - the operator
  power creep's body art at levels 0-4 (hexagonal hull plus six plates around
  a disc). Parsed by `scripts/extractPowerArt.cjs` into
  `ui/src/canvas/powerCreepArt.ts` as flat polygon point data; never edit that
  file by hand, regenerate it instead.
- `metadata/images/<icon>.svg` for the 18 power icons named in
  `ui/src/game/powerInfo.ts` (`generate-ops`, `operate-spawn`, `operate-tower`,
  `operate-storage`, `operate-lab`, `operate-extension`, `operate-observer`,
  `operate-terminal`, `disrupt-spawn`, `disrupt-tower`, `disrupt-source`,
  `shield`, `regen-source`, `regen-mineral`, `disrupt-terminal`,
  `operate-power`, `fortify`, `operate-controller`) - rasterised to
  `powers/<icon>.png`. `OPERATE_FACTORY` has no icon in the source renderer,
  so it has no PNG here; callers fall back to a vector pill.

## Regenerating

The generator needs `@napi-rs/canvas`'s native binary, which is only
installed in the `dojo` docker image, and the renderer source has to be
cloned where the script runs (a host temp dir is not mounted in the
container):

```bash
docker compose run --rm dojo sh -c "git clone --depth 1 https://github.com/screeps/renderer /tmp/screeps-renderer && git -C /tmp/screeps-renderer rev-parse HEAD && node scripts/extractPowerArt.cjs /tmp/screeps-renderer"
```

Record the printed SHA above if it changes.

### Notes on the source SVGs (screeps/renderer@a2db4a76)

- Each `operator-lvl{N}.svg` opens with a degenerate one-vertex path
  (`M58,12.8`, `fill="#FFFFFF"`) that isn't real geometry; the generator skips
  any path with fewer than 3 vertices.
- The hull is one compound `<path>` with two subpaths: an outer hexagon and,
  after the first `Z`, a smaller inner hexagon - the hull's hole. Both ship as
  one plate (`subpaths.length === 2`) so callers can fill it with the
  `'evenodd'` rule.
- A ring `<path>` around the disc has no `fill` attribute and uses curve
  commands (`c`/`C`). It's skipped because it has no fill; the generator only
  errors when a *filled* path uses a command outside `M m H h V v L l Z z`.
- The six plates are `<polygon>` elements, each `fill="#FFFFFF"` (lit, tinted
  red by the renderer) or `fill="#1D1D1D"` (dark).
- The disc is the one `<circle>`, `r` ~= 28.6 at `(64, 76)`. At level 4 it
  carries no `fill` (the game renderer fills it with the owner colour); the
  generator still takes its geometry.
- Confirmed lit-plate counts per tier (hull + 6 polygons, degenerate path
  excluded): `[0, 1, 4, 5, 7]` for levels 0-4 - matches
  `ui/src/canvas/__tests__/powerCreepArt.test.ts`.

### Notes on the icon SVGs

- Each icon SVG has only `viewBox="0 0 32.73 32.73"`, no `width`/`height`, so
  `@napi-rs/canvas` would otherwise load it at ~33px and the PNG would
  upscale blurry. The generator injects `width="128" height="128"` on the
  root `<svg>` before rasterising.
- Colour comes from CSS classes in a `<style>` block
  (`.cls-1{fill:#cc3d3e;}`, etc.), not inline `fill` attributes.
  `@napi-rs/canvas`'s SVG loader drops those class rules (confirmed by eye: a
  `generate-ops` icon rasterised solid black instead of red/yellow), so the
  generator inlines each class's declarations as presentation attributes
  before calling `loadImage`.
