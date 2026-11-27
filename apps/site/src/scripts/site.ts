import { animate, press } from 'motion'

const root = document.documentElement
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

// Theme: follows the system unless the visitor picks Light or Dark in the footer.
type ThemeChoice = 'system' | 'light' | 'dark'
const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')]
const currentChoice = (): ThemeChoice => (root.dataset.theme === 'light' || root.dataset.theme === 'dark' ? root.dataset.theme : 'system')
function markThemeChoice() {
  const choice = currentChoice()
  themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)))
}
themeButtons.forEach((b) =>
  b.addEventListener('click', () => {
    const choice = b.dataset.themeChoice as ThemeChoice
    if (choice === 'system') delete root.dataset.theme
    else root.dataset.theme = choice
    try {
      if (choice === 'system') localStorage.removeItem('ssm-theme')
      else localStorage.setItem('ssm-theme', choice)
    } catch {
      // Storage can be blocked; the choice then lasts for this page only.
    }
    markThemeChoice()
  }),
)
markThemeChoice()

document.querySelectorAll<HTMLAnchorElement>('.lang-menu a[data-lang]').forEach((a) =>
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('ssm-lang', a.dataset.lang ?? 'en')
    } catch {
      // Without storage the browser's language decides next time.
    }
  }),
)
const menus = [...document.querySelectorAll<HTMLDetailsElement>('details.lang')]
document.addEventListener('click', (e) => {
  menus.forEach((m) => {
    if (m.open && !m.contains(e.target as Node)) m.open = false
  })
})
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  menus.forEach((m) => {
    if (m.open) {
      m.open = false
      m.querySelector('summary')?.focus()
    }
  })
})

// Copy buttons: copy the text of the element they name, then say so for a moment.
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) =>
  b.addEventListener('click', async () => {
    const text = document.getElementById(b.dataset.copy!)?.textContent?.trim() ?? ''
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    const label = b.querySelector('span') ?? b
    const before = label.textContent
    label.textContent = b.dataset.done ?? before
    b.classList.add('done')
    setTimeout(() => {
      label.textContent = before
      b.classList.remove('done')
    }, 1600)
  }),
)

// Table of contents follows the section in view.
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.doc-toc a')]
if (tocLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(tocLinks.map((a) => [a.hash.slice(1), a]))
  const spy = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return
        tocLinks.forEach((a) => a.classList.remove('on'))
        byId.get(e.target.id)?.classList.add('on')
      }),
    { rootMargin: '-20% 0px -70% 0px' },
  )
  byId.forEach((_, id) => {
    const el = document.getElementById(id)
    if (el) spy.observe(el)
  })
}

// Every button and control gives a small spring when pressed.
if (!reduce) {
  press('.btn, .chip-btn, .faq summary, .lang-menu a, .links a, .foot-cols a, .pill-tag, .mk-btn, .mk-chipbtn, .ai-copy-sm', (el) => {
    animate(el, { scale: 0.94 }, { type: 'spring', stiffness: 600, damping: 30 })
    return () => animate(el, { scale: 1 }, { type: 'spring', bounce: 0.55, duration: 0.45 })
  })
}

// Parts of a section rise in once, in reading order. Hidden here rather than in the CSS, so nothing stays hidden if this script never runs.
if (!reduce && !document.hidden && 'IntersectionObserver' in window) {
  const parts = [...document.querySelectorAll<HTMLElement>('.rise, .reveal')]
  parts.forEach((p) => {
    p.classList.add('rise', 'wait')
    const sibs = [...(p.parentElement?.children ?? [])].filter((c) => c.classList.contains('rise'))
    p.style.setProperty('--d', `${Math.min(Math.max(0, sibs.indexOf(p)), 5) * 0.075}s`)
  })
  const show = new IntersectionObserver(
    (es, o) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return
        ;(e.target as HTMLElement).classList.remove('wait')
        o.unobserve(e.target)
      }),
    { rootMargin: '0px 0px -8% 0px' },
  )
  parts.forEach((p) => show.observe(p))
  // A throttled or background tab may never report them in view: never leave what is on screen hidden.
  setTimeout(
    () =>
      parts.forEach((p) => {
        if (!p.classList.contains('wait') || p.getBoundingClientRect().top >= innerHeight) return
        p.style.transition = 'none'
        p.classList.remove('wait')
      }),
    1800,
  )
}
