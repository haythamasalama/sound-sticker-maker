import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'))
const output = `sound-sticker-maker-${version}.zip`

for (const required of ['manifest.json', 'content.js', 'page.js', 'background.js', 'youtube.js', 'player.js', 'icons/icon-128.png']) {
  if (!existsSync(`dist/${required}`)) throw new Error(`Missing dist/${required}. Run "pnpm build" first.`)
}

rmSync(output, { force: true })
execFileSync('zip', ['-r', '-q', `../${output}`, '.', '-x', '*.map', '*.DS_Store'], { cwd: 'dist', stdio: 'inherit' })
console.log(`Created ${output}`)
