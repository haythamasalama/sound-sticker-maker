import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { build } from 'vite'

const target = process.argv[2]
if (target !== 'store' && target !== 'github') {
  console.error('Usage: node scripts/build.mjs <store|github>')
  process.exit(1)
}
// The Chrome Web Store build leaves out YouTube and TikTok links: its policies forbid saving media from other sites.
const links = target === 'github'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}dist/${target}`
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const entries = [
  { entry: 'src/content/main.ts', name: 'content', ui: true },
  { entry: 'src/page/main.ts', name: 'page' },
  { entry: 'src/background/index.ts', name: 'background' },
  ...(links
    ? [
        { entry: 'src/frames/youtube.ts', name: 'youtube' },
        { entry: 'src/player/main.ts', name: 'player' },
      ]
    : []),
]

for (const { entry, name, ui } of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    plugins: ui ? [vue(), tailwindcss()] : [],
    resolve: {
      alias: [
        { find: '@', replacement: `${root}src` },
        ...(links ? [] : [{ find: /^\.\/LinkImport\.vue$/, replacement: `${root}src/features/picture/LinkImportOff.vue` }]),
      ],
    },
    define: {
      __LINKS__: String(links),
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
if (links) {
  const extra = JSON.parse(readFileSync(`${root}manifest.links.json`, 'utf8'))
  manifest.permissions = [...manifest.permissions, ...extra.permissions]
  manifest.host_permissions = [...manifest.host_permissions, ...extra.host_permissions]
  manifest.content_scripts = [...manifest.content_scripts, ...extra.content_scripts]
  manifest.web_accessible_resources = extra.web_accessible_resources
  manifest.externally_connectable = extra.externally_connectable
  // A fixed key keeps the same extension ID wherever the folder is loaded from, so the website can reach it.
  manifest.key = extra.key
}
writeFileSync(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
cpSync(`${root}icons`, `${outDir}/icons`, { recursive: true })
cpSync(`${root}_locales`, `${outDir}/_locales`, { recursive: true })
if (links) cpSync(`${root}public/player.html`, `${outDir}/player.html`)
console.log(`Built ${target} in dist/${target}`)
