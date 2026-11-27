import type { APIRoute } from 'astro'
import { absolute } from '../i18n'

const AGENTS = [
  '*',
  'Googlebot',
  'Bingbot',
  'Applebot',
  'DuckDuckBot',
  'YandexBot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Meta-ExternalAgent',
  'MistralAI-User',
]

export const GET: APIRoute = () =>
  new Response(
    [
      '# Search engines and AI assistants are welcome to read the whole site.',
      ...AGENTS.map((a) => `User-agent: ${a}\nAllow: /\n`),
      `Sitemap: ${absolute('sitemap-index.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
