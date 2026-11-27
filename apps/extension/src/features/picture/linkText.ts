import { computed } from 'vue'
import { useI18n, type Locale } from '@/lib/i18n'

interface LinkText {
  linkTitle: string
  linkPlaceholder: string
  getClip: string
  badLink: string
  linkHint: string
  openVideo: string
  playPart: string
  startPoint: string
  movePart: string
  followHint: string
  shorter: string
  longer: string
  zoomIn: string
  zoomOut: string
  zoomHint: string
  overview: string
  back: string
  forward: string
  usePart: string
}

const text: Record<Locale, LinkText> = {
  en: {
    linkTitle: 'Paste a YouTube or TikTok video link',
    linkPlaceholder: 'YouTube or TikTok link',
    getClip: 'Get the video',
    badLink: "That isn't a YouTube or TikTok video link.",
    linkHint: 'The video opens here. Watch it, then pick the part you want from anywhere in it.',
    openVideo: 'Open',
    playPart: 'Play the part from its start',
    startPoint: 'Start',
    movePart: 'Drag to move the whole part',
    followHint: 'The part starts where the video is. Pause on the moment you like, or type a time.',
    shorter: 'Shorter',
    longer: 'Longer',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomHint: '{key} + scroll to zoom',
    overview: 'The whole video: click or drag to go anywhere in it',
    back: 'Back {n} seconds',
    forward: 'Forward {n} seconds',
    usePart: 'Use this part',
  },
  ar: {
    linkTitle: 'الصق رابط فيديو من يوتيوب أو تيك توك',
    linkPlaceholder: 'رابط يوتيوب أو تيك توك',
    getClip: 'اجلب الفيديو',
    badLink: 'هذا ليس رابط فيديو من يوتيوب أو تيك توك.',
    linkHint: 'يفتح الفيديو هنا. شاهده ثم اختر الجزء الذي تريده من أي مكان فيه.',
    openVideo: 'افتح',
    playPart: 'شغّل الجزء من بدايته',
    startPoint: 'البداية',
    movePart: 'اسحب لتحريك الجزء كله',
    followHint: 'يبدأ الجزء من حيث يقف الفيديو. أوقفه عند اللقطة التي تعجبك، أو اكتب الوقت.',
    shorter: 'أقصر',
    longer: 'أطول',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    zoomHint: '{key} + عجلة الماوس للتكبير',
    overview: 'الفيديو كله: اضغط أو اسحب لتذهب لأي مكان فيه',
    back: 'رجوع {n} ثوانٍ',
    forward: 'تقديم {n} ثوانٍ',
    usePart: 'استخدم هذا الجزء',
  },
  es: {
    linkTitle: 'Pega el enlace de un video de YouTube o TikTok',
    linkPlaceholder: 'Enlace de YouTube o TikTok',
    getClip: 'Traer el video',
    badLink: 'Eso no es un enlace de video de YouTube o TikTok.',
    linkHint: 'El video se abre aquí. Míralo y elige la parte que quieras, de cualquier punto.',
    openVideo: 'Abrir',
    playPart: 'Reproducir la parte desde el inicio',
    startPoint: 'Inicio',
    movePart: 'Arrastra para mover toda la parte',
    followHint: 'La parte empieza donde está el video. Páusalo en el momento que te guste o escribe un tiempo.',
    shorter: 'Más corto',
    longer: 'Más largo',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    zoomHint: '{key} + rueda para acercar',
    overview: 'Todo el video: haz clic o arrastra para ir a cualquier punto',
    back: 'Atrás {n} segundos',
    forward: 'Adelante {n} segundos',
    usePart: 'Usar esta parte',
  },
  pt: {
    linkTitle: 'Cole o link de um vídeo do YouTube ou TikTok',
    linkPlaceholder: 'Link do YouTube ou TikTok',
    getClip: 'Pegar o vídeo',
    badLink: 'Isso não é um link de vídeo do YouTube ou TikTok.',
    linkHint: 'O vídeo abre aqui. Assista e escolha a parte que quiser, de qualquer ponto.',
    openVideo: 'Abrir',
    playPart: 'Tocar a parte do início',
    startPoint: 'Início',
    movePart: 'Arraste para mover a parte inteira',
    followHint: 'A parte começa onde o vídeo está. Pause no momento que quiser ou digite um tempo.',
    shorter: 'Mais curto',
    longer: 'Mais longo',
    zoomIn: 'Aproximar',
    zoomOut: 'Afastar',
    zoomHint: '{key} + rolagem para zoom',
    overview: 'O vídeo inteiro: clique ou arraste para ir a qualquer ponto',
    back: 'Voltar {n} segundos',
    forward: 'Avançar {n} segundos',
    usePart: 'Usar esta parte',
  },
  id: {
    linkTitle: 'Tempel tautan video YouTube atau TikTok',
    linkPlaceholder: 'Tautan YouTube atau TikTok',
    getClip: 'Ambil videonya',
    badLink: 'Itu bukan tautan video YouTube atau TikTok.',
    linkHint: 'Video terbuka di sini. Tonton, lalu pilih bagian yang kamu mau dari mana saja.',
    openVideo: 'Buka',
    playPart: 'Putar bagian dari awal',
    startPoint: 'Mulai',
    movePart: 'Seret untuk memindahkan seluruh bagian',
    followHint: 'Bagian dimulai di posisi video. Jeda di momen yang kamu suka, atau ketik waktunya.',
    shorter: 'Lebih pendek',
    longer: 'Lebih panjang',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    zoomHint: '{key} + gulir untuk zoom',
    overview: 'Seluruh video: klik atau seret untuk pergi ke mana saja',
    back: 'Mundur {n} detik',
    forward: 'Maju {n} detik',
    usePart: 'Pakai bagian ini',
  },
  hi: {
    linkTitle: 'YouTube या TikTok वीडियो का लिंक चिपकाएँ',
    linkPlaceholder: 'YouTube या TikTok लिंक',
    getClip: 'वीडियो लाएँ',
    badLink: 'यह YouTube या TikTok वीडियो लिंक नहीं है।',
    linkHint: 'वीडियो यहीं खुलता है। उसे देखें, फिर कहीं से भी अपना हिस्सा चुनें।',
    openVideo: 'खोलें',
    playPart: 'हिस्सा शुरू से चलाएँ',
    startPoint: 'शुरुआत',
    movePart: 'पूरा हिस्सा खिसकाने के लिए खींचें',
    followHint: 'हिस्सा वहीं से शुरू होता है जहाँ वीडियो है। पसंद के पल पर रोकें, या समय लिखें।',
    shorter: 'छोटा',
    longer: 'लंबा',
    zoomIn: 'ज़ूम इन',
    zoomOut: 'ज़ूम आउट',
    zoomHint: 'ज़ूम के लिए {key} + स्क्रॉल',
    overview: 'पूरा वीडियो: कहीं भी जाने के लिए क्लिक करें या खींचें',
    back: '{n} सेकंड पीछे',
    forward: '{n} सेकंड आगे',
    usePart: 'यह हिस्सा लें',
  },
}

export function useLinkText() {
  const { locale } = useI18n()
  return computed(() => text[locale.value])
}
