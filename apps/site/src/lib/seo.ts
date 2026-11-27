import { AUTHOR_NAME, AUTHOR_URL, REPO_URL, RELEASES_URL, STORE_URL } from '../config'
import { LANGS, SITE, absolute, pageIn, useT, type Lang } from '../i18n'

export const authorNode = {
  '@type': 'Person',
  '@id': `${AUTHOR_URL}/#person`,
  name: AUTHOR_NAME,
  url: AUTHOR_URL,
  sameAs: ['https://github.com/haythamasalama', 'https://x.com/haythamasalama'],
}

export function appNode(lang: Lang) {
  const t = useT(lang)
  const download = STORE_URL || RELEASES_URL
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE}/#app`,
    name: 'Sound Sticker Maker',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Chrome',
    browserRequirements: 'Google Chrome, Microsoft Edge or another Chromium browser on a computer',
    applicationSubCategory: 'WhatsApp sound sticker maker',
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: REPO_URL,
    author: { '@id': `${AUTHOR_URL}/#person` },
    description: t('seo.desc'),
    url: absolute(),
    image: absolute('og.png'),
    inLanguage: [...LANGS],
    downloadUrl: download,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}

export const faqNode = (url: string, lang: Lang, items: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  '@id': `${url}#faq`,
  inLanguage: lang,
  mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

export const breadcrumbNode = (url: string, crumbs: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  '@id': `${url}#crumbs`,
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path) })),
})

export function howToNode(lang: Lang) {
  const t = useT(lang)
  return {
    '@type': 'HowTo',
    '@id': `${absolute(pageIn(lang))}#howto`,
    name: t('how.name'),
    inLanguage: lang,
    totalTime: 'PT1M',
    tool: [{ '@type': 'HowToTool', name: 'Sound Sticker Maker' }],
    step: ([1, 2, 3] as const).map((n) => ({ '@type': 'HowToStep', position: n, name: t(`how.${n}t`), text: t(`how.${n}b`) })),
  }
}
