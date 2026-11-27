import { chmodSync, readFileSync } from 'node:fs'
import { build } from 'esbuild'

// One file with the engine's format code inlined; the MCP SDK and zod stay as npm dependencies.
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@modelcontextprotocol/server', 'zod'],
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'warning',
})
chmodSync('dist/index.js', 0o755)
console.log('Built dist/index.js')
