import { computed } from 'vue'
import { useI18n, type Locale } from '@/lib/i18n'

interface LinkText {
  linkTitle: string
  linkPlaceholder: string
  getClip: string
  badLink: string
}

const text: Record<Locale, LinkText> = {
  en: {
    linkTitle: 'Paste a YouTube or TikTok video link',
    linkPlaceholder: 'YouTube or TikTok link',
    getClip: 'Get the video',
    badLink: "That isn't a YouTube or TikTok video link.",
  },
  ar: {
    linkTitle: 'الصق رابط فيديو من يوتيوب أو تيك توك',
    linkPlaceholder: 'رابط يوتيوب أو تيك توك',
    getClip: 'اجلب الفيديو',
    badLink: 'هذا ليس رابط فيديو من يوتيوب أو تيك توك.',
  },
  es: {
    linkTitle: 'Pega el enlace de un video de YouTube o TikTok',
    linkPlaceholder: 'Enlace de YouTube o TikTok',
    getClip: 'Traer el video',
    badLink: 'Eso no es un enlace de video de YouTube o TikTok.',
  },
  pt: {
    linkTitle: 'Cole o link de um vídeo do YouTube ou TikTok',
    linkPlaceholder: 'Link do YouTube ou TikTok',
    getClip: 'Pegar o vídeo',
    badLink: 'Isso não é um link de vídeo do YouTube ou TikTok.',
  },
  id: {
    linkTitle: 'Tempel tautan video YouTube atau TikTok',
    linkPlaceholder: 'Tautan YouTube atau TikTok',
    getClip: 'Ambil videonya',
    badLink: 'Itu bukan tautan video YouTube atau TikTok.',
  },
  hi: {
    linkTitle: 'YouTube या TikTok वीडियो का लिंक चिपकाएँ',
    linkPlaceholder: 'YouTube या TikTok लिंक',
    getClip: 'वीडियो लाएँ',
    badLink: 'यह YouTube या TikTok वीडियो लिंक नहीं है।',
  },
}

/** Kept apart from the shared strings so the Chrome Web Store build carries no link-import text. */
export function useLinkText() {
  const { locale } = useI18n()
  return computed(() => text[locale.value])
}
