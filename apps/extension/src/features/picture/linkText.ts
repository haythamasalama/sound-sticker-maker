import { computed } from 'vue'
import { useI18n } from '@/lib/i18n'

const text = {
  en: {
    orLink: 'Or paste a link',
    linkPlaceholder: 'YouTube or TikTok link',
    getClip: 'Get clip',
    recordingYoutube: 'Recording from YouTube… this takes as long as the clip.',
    downloadingTiktok: 'Downloading from TikTok…',
    badLink: "That isn't a YouTube or TikTok video link.",
  },
  ar: {
    orLink: 'أو الصق رابطاً',
    linkPlaceholder: 'رابط يوتيوب أو تيك توك',
    getClip: 'اجلب المقطع',
    recordingYoutube: 'يتم تسجيل المقطع من يوتيوب… يستغرق بقدر مدة المقطع.',
    downloadingTiktok: 'يتم التنزيل من تيك توك…',
    badLink: 'هذا ليس رابط فيديو من يوتيوب أو تيك توك.',
  },
}

/** Kept apart from the shared strings so the Chrome Web Store build carries no link-import text. */
export function useLinkText() {
  const { locale } = useI18n()
  return computed(() => text[locale.value])
}
