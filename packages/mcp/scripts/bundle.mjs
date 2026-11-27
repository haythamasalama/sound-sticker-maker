// Builds sound-sticker-maker.mcpb: a one-click installer for Claude Desktop with every dependency inside.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const out = 'bundle'
rmSync(out, { recursive: true, force: true })
mkdirSync(`${out}/server`, { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: `${out}/server/index.js`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  define: { __VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'warning',
})

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
manifest.version = pkg.version
writeFileSync(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
cpSync('../../brand/icon-512.png', `${out}/icon.png`)

rmSync('sound-sticker-maker.mcpb', { force: true })
execFileSync('pnpm', ['exec', 'mcpb', 'pack', out, 'sound-sticker-maker.mcpb'], { stdio: 'inherit' })
console.log('Created sound-sticker-maker.mcpb')
