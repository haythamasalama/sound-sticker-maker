import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'))

for (const target of ['store', 'github']) {
  const dir = `dist/${target}`
  for (const required of ['manifest.json', 'content.js', 'page.js', 'background.js', 'icons/icon-128.png']) {
    if (!existsSync(`${dir}/${required}`)) throw new Error(`Missing ${dir}/${required}. Run "pnpm build" first.`)
  }
  const output = `sound-sticker-maker-${version}-${target}.zip`
  rmSync(output, { force: true })
  execFileSync('zip', ['-r', '-q', `../../${output}`, '.', '-x', '*.map', '*.DS_Store'], { cwd: dir, stdio: 'inherit' })
  console.log(`Created ${output}`)
}
