import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { build } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}dist`
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const entries = [
  { entry: 'src/content/main.ts', name: 'content', ui: true },
  { entry: 'src/page/main.ts', name: 'page' },
  { entry: 'src/page/guard.ts', name: 'guard' },
  { entry: 'src/background/index.ts', name: 'background' },
  { entry: 'src/frames/youtube.ts', name: 'youtube' },
  { entry: 'src/player/main.ts', name: 'player' },
]

for (const { entry, name, ui } of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    plugins: ui ? [vue(), tailwindcss()] : [],
    resolve: { alias: { '@': `${root}src` } },
    define: {
      'process.env.NODE_ENV': '"production"',
      __VUE_OPTIONS_API__: 'false',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    build: {
      outDir,
      emptyOutDir: false,
      cssCodeSplit: false,
      sourcemap: false,
      lib: { entry: `${root}${entry}`, formats: ['iife'], name: `ssm_${name}`, fileName: () => `${name}.js` },
    },
  })
}

const manifest = JSON.parse(readFileSync(`${root}manifest.json`, 'utf8'))
writeFileSync(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
cpSync(`${root}icons`, `${outDir}/icons`, { recursive: true })
cpSync(`${root}_locales`, `${outDir}/_locales`, { recursive: true })
cpSync(`${root}public/player.html`, `${outDir}/player.html`)
console.log('Built dist')
