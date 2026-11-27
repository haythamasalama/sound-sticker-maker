import process from 'node:process'
import { URL } from 'node:url'
import { copyFile } from 'node:fs/promises'
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const site = process.env.SITE_URL || 'https://sound-sticker-maker.haythamasalama.me'
const base = process.env.SITE_BASE || '/'
const root = base.replace(/\/$/, '')

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      xslURL: `${root}/sitemap.xsl`,
      filter: (page) => !/\/404\/?$/.test(page),
      serialize(item) {
        const en = item.links?.find((l) => l.lang === 'en')
        if (en && !item.links.some((l) => l.lang === 'x-default')) item.links.push({ lang: 'x-default', url: en.url })
        const path = new URL(item.url).pathname.slice(root.length).replace(/^\/(ar|es|pt|id|hi)\//, '/')
        item.priority = path === '/' ? 1 : path === '/maker/' ? 0.8 : 0.5
        item.changefreq = path === '/' ? 'weekly' : 'monthly'
        return item
      },
      i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar', es: 'es', pt: 'pt-BR', id: 'id', hi: 'hi' } },
    }),
    {
      name: 'sitemap-alias',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir))
        },
      },
    },
  ],
})
