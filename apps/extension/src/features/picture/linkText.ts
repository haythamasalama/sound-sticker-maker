import { computed } from 'vue'
import { useI18n, type Locale } from '@/lib/i18n'

interface LinkText {
  linkPlaceholder: string
  getClip: string
  badLink: string
}

const text: Record<Locale, LinkText> = {
  en: { linkPlaceholder: 'YouTube or TikTok link', getClip: 'Get clip', badLink: "That isn't a YouTube or TikTok video link." },
  ar: { linkPlaceholder: 'رابط يوتيوب أو تيك توك', getClip: 'اجلب المقطع', badLink: 'هذا ليس رابط فيديو من يوتيوب أو تيك توك.' },
  es: {
    linkPlaceholder: 'Enlace de YouTube o TikTok',
    getClip: 'Traer clip',
    badLink: 'Eso no es un enlace de video de YouTube o TikTok.',
  },
  pt: {
    linkPlaceholder: 'Link do YouTube ou TikTok',
    getClip: 'Pegar trecho',
    badLink: 'Isso não é um link de vídeo do YouTube ou TikTok.',
  },
  id: { linkPlaceholder: 'Tautan YouTube atau TikTok', getClip: 'Ambil klip', badLink: 'Itu bukan tautan video YouTube atau TikTok.' },
  hi: { linkPlaceholder: 'YouTube या TikTok लिंक', getClip: 'क्लिप लाएँ', badLink: 'यह YouTube या TikTok वीडियो लिंक नहीं है।' },
}

/** Kept apart from the shared strings so the Chrome Web Store build carries no link-import text. */
export function useLinkText() {
  const { locale } = useI18n()
  return computed(() => text[locale.value])
}
