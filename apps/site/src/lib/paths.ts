/** Joins a site path onto a base path, so the site works at a domain root or under a folder. */
export function joinBase(base: string, path = ''): string {
  const root = base.replace(/\/+$/, '')
  const rest = path.replace(/^\/+/, '')
  return `${root}/${rest}`
}

/** The same page in another language: `es/maker/` → `ar/maker/`, with English at the root. */
export function swapLang(path: string, to: string, langs: readonly string[], fallback = 'en'): string {
  const bare = path.replace(/^\/+/, '').replace(new RegExp(`^(${langs.join('|')})/`), '')
  return to === fallback ? bare : `${to}/${bare}`
}
