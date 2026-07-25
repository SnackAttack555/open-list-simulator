/**
 * Extracts a state outline as an SVG path, from real boundary data.
 *
 *   npm i -D us-atlas d3-geo topojson-client
 *   node scripts/generate-outline.mjs 26      # Michigan
 *   node scripts/generate-outline.mjs 08      # Colorado
 *   npm uninstall us-atlas d3-geo topojson-client
 *
 * Those three packages are NOT installed by default, on purpose — see the note
 * about uninstalling below. Install them only while running this script.
 *
 * Source is us-atlas, which packages US Census TIGER boundaries — a US federal
 * government work, so public domain. Nothing here is drawn, traced, or eyeballed.
 *
 * Paste the printed `viewBox` and `path` into the region's `outline` in
 * src/data/regions.js, then uninstall the three dev dependencies this needs
 * (us-atlas, d3-geo, topojson-client). They exist only to produce that string;
 * keeping them would mean carrying a build dependency for a constant.
 *
 * The state is projected on its own rather than in a national projection, so it
 * fills the box instead of sitting tiny in the middle of a continent.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { geoPath, geoConicConformal } from 'd3-geo'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)

const fips = (process.argv[2] ?? '26').padStart(2, '0')
const WIDTH = 100
const HEIGHT = 100
const PRECISION = 1

const topo = JSON.parse(readFileSync(require.resolve('us-atlas/states-10m.json'), 'utf8'))
const states = feature(topo, topo.objects.states)
const state = states.features.find((f) => f.id === fips)

if (!state) {
  const available = states.features
    .map((f) => `${f.id} ${f.properties?.name ?? ''}`)
    .sort()
    .join('\n  ')
  console.error(`No state with FIPS "${fips}". Available:\n  ${available}`)
  process.exit(1)
}

// Conic conformal, fitted to the state itself. Keeps the shape recognisable
// (Michigan's mitten reads wrong under a plain equirectangular projection).
const projection = geoConicConformal().rotate([86, 0]).center([0, 44])
projection.fitExtent(
  [
    [2, 2],
    [WIDTH - 2, HEIGHT - 2],
  ],
  state,
)

const path = geoPath(projection).digits(PRECISION)(state)

console.log(`state:   ${state.properties?.name} (FIPS ${fips})`)
console.log(`viewBox: 0 0 ${WIDTH} ${HEIGHT}`)
console.log(`length:  ${path.length} chars`)
console.log(`subpaths: ${(path.match(/M/g) ?? []).length} (Michigan should be 2+: peninsulas and islands)`)
console.log()
console.log(path)
