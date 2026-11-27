import { joinBase, swapLang } from '../lib/paths'
import { UI, type Key } from './ui'

export const LANGS = ['en', 'ar', 'es', 'pt', 'id', 'hi'] as const
export type Lang = (typeof LANGS)[number]
export type { Key }

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  pt: 'Português',
  id: 'Bahasa Indonesia',
  hi: 'हिन्दी',
}
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ar: 'ar_AR', es: 'es_ES', pt: 'pt_BR', id: 'id_ID', hi: 'hi_IN' }
/** The HTML lang attribute: the Portuguese copy is Brazilian. */
export const HTML_LANG: Record<Lang, string> = { en: 'en', ar: 'ar', es: 'es', pt: 'pt-BR', id: 'id', hi: 'hi' }

export const BASE = import.meta.env.BASE_URL
/** The site's origin plus its base path, without a trailing slash. */
export const SITE = (import.meta.env.SITE ?? '').replace(/\/+$/, '') + joinBase(BASE).replace(/\/$/, '')

/** A path inside the site, with the base path in front. */
export const href = (path = '') => joinBase(BASE, path)
/** The same path as an absolute URL, for canonical links and structured data. */
export const absolute = (path = '') => SITE + '/' + path.replace(/^\/+/, '')

export const dirOf = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr')
/** A page path without the base, in the given language: `maker/` → `es/maker/`. */
export const pageIn = (lang: Lang, page = '') => swapLang(page, lang, LANGS)

export function useT(lang: Lang) {
  return (key: Key): string => UI[lang][key] ?? UI.en[key] ?? key
}

/** The extension itself speaks English and Arabic; drawings of it use one of those. */
export const panelLang = (lang: Lang): Lang => (lang === 'ar' ? 'ar' : 'en')
