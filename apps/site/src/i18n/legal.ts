import { ISSUES_URL } from '../config'
import type { Lang } from './index'

export interface LegalPage {
  title: string
  description: string
  h1: string
  date: string
  lead: string
  summary: { icon: string; t: string; b: string }[]
  toc: string
  sections: { id: string; h2: string; html: string }[]
}

const issues = `<a href="${ISSUES_URL}" dir="ltr">GitHub issues</a>`
const gh = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'
const wa = 'https://www.whatsapp.com/legal/privacy-policy'

export const PRIVACY: Record<Lang, LegalPage> = {
  en: {
    title: 'Privacy policy | Sound Sticker Maker',
    description:
      'Sound Sticker Maker collects no data. Your pictures and sounds never leave your browser: no account, no analytics, no uploads.',
    h1: 'Privacy policy',
    date: 'Effective 27 November 2026',
    lead: 'Sound Sticker Maker collects no data. Your pictures and sounds are read and turned into stickers inside your browser, and never leave it.',
    summary: [
      { icon: 'user', t: 'No account', b: 'Nothing to sign up for.' },
      { icon: 'cloud', t: 'Nothing uploaded', b: 'Files stay in your browser.' },
      { icon: 'eye', t: 'No analytics', b: 'Neither the extension nor this site counts you.' },
      { icon: 'code', t: 'Open source', b: 'Every line can be read on GitHub.' },
    ],
    toc: 'On this page',
    sections: [
      {
        id: 'collect',
        h2: 'What we collect',
        html: '<p>Nothing. The extension and this website have no account, no analytics, no advertising and no tracking. We run no server that receives your data, and we don’t sell or share data with anyone.</p>',
      },
      {
        id: 'files',
        h2: 'Your pictures and sounds',
        html: '<ul><li>The videos, GIFs, pictures and sounds you choose are read and encoded by your browser on your computer.</li><li>The finished sticker goes straight from your browser to WhatsApp, the same way a sticker you send yourself does. WhatsApp’s own <a href="https://www.whatsapp.com/legal/privacy-policy">privacy policy</a> covers what happens after that.</li><li>The online maker on this site works the same way: the files you pick are never sent anywhere, and the sticker you download is made on the page.</li><li>If you import a YouTube or TikTok link there, the extension plays the video from youtube-nocookie.com or fetches it from tiktok.com, the same as watching it on those sites. Nothing is sent to them but the request for that video.</li></ul>',
      },
      {
        id: 'permissions',
        h2: 'The extension’s permissions',
        html: '<ul><li><strong>storage</strong> keeps your choices, such as the language, the pack name and the author, in your browser.</li><li><strong>web.whatsapp.com</strong> lets the extension add its panel to WhatsApp Web and send the sticker in the open chat.</li></ul><p>When you import a YouTube or TikTok link, the extension also uses:</p><ul><li><strong>youtube-nocookie.com</strong> and <strong>tiktok.com</strong>, to play the video from the link you paste so its picture and sound can be recorded.</li><li><strong>declarativeNetRequest</strong>, used only to set the Referer header on those video requests, which those sites require before they play a video. It doesn’t read, block or change any other request.</li></ul>',
      },
      {
        id: 'website',
        h2: 'This website',
        html: '<ul><li>The site uses no analytics and no cookies, and loads nothing from other sites: its fonts are served from the site itself.</li><li>It is hosted on GitHub Pages, which, like any web host, receives your IP address when you visit; see <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s Privacy Statement</a>.</li><li>If you choose light or dark mode, or a language, that choice is saved only in your browser.</li></ul>',
      },
      { id: 'children', h2: 'Children', html: '<p>Sound Sticker Maker collects no data from anyone, including children.</p>' },
      {
        id: 'contact',
        h2: 'Changes and contact',
        html: `<p>If this policy changes, the new version will be posted on this page with a new date. Questions: open an issue on ${issues}.</p>`,
      },
    ],
  },
  ar: {
    title: 'سياسة الخصوصية | صانع الملصقات الصوتية',
    description: 'صانع الملصقات الصوتية لا يجمع أي بيانات. صورك وأصواتك لا تغادر متصفحك: لا حساب ولا تحليلات ولا رفع ملفات.',
    h1: 'سياسة الخصوصية',
    date: 'سارية من ٢٧ نوفمبر ٢٠٢٦',
    lead: 'صانع الملصقات الصوتية لا يجمع أي بيانات. تُقرأ صورك وأصواتك وتتحول إلى ملصقات داخل متصفحك، ولا تغادره.',
    summary: [
      { icon: 'user', t: 'بلا حساب', b: 'لا شيء تسجّل فيه.' },
      { icon: 'cloud', t: 'لا يُرفع شيء', b: 'الملفات تبقى في متصفحك.' },
      { icon: 'eye', t: 'بلا تحليلات', b: 'لا الإضافة ولا هذا الموقع يحصيانك.' },
      { icon: 'code', t: 'مفتوحة المصدر', b: 'كل سطر متاح للقراءة على GitHub.' },
    ],
    toc: 'في هذه الصفحة',
    sections: [
      {
        id: 'collect',
        h2: 'ما الذي نجمعه',
        html: '<p>لا شيء. الإضافة وهذا الموقع بلا حساب ولا تحليلات ولا إعلانات ولا تتبّع. لا نشغّل أي خادم يستقبل بياناتك، ولا نبيع بيانات لأحد ولا نشاركها.</p>',
      },
      {
        id: 'files',
        h2: 'صورك وأصواتك',
        html: '<ul><li>الفيديوهات والصور وملفات GIF والأصوات التي تختارها يقرؤها متصفحك ويعالجها على جهازك.</li><li>يذهب الملصق الجاهز من متصفحك إلى واتساب مباشرة، كما يذهب أي ملصق ترسله بنفسك. وما يحدث بعد ذلك تغطيه <a href="https://www.whatsapp.com/legal/privacy-policy">سياسة خصوصية واتساب</a>.</li><li>الصانع على هذا الموقع يعمل بالطريقة نفسها: الملفات التي تختارها لا تُرسل إلى أي مكان، والملصق الذي تنزّله يُصنع في الصفحة.</li><li>وإن استوردت فيه رابط YouTube أو TikTok، تشغّل الإضافة الفيديو من youtube-nocookie.com أو تجلبه من tiktok.com، كما لو شاهدته هناك. لا يُرسل إليهما إلا طلب ذلك الفيديو.</li></ul>',
      },
      {
        id: 'permissions',
        h2: 'أذونات الإضافة',
        html: '<ul><li><strong dir="ltr">storage</strong> يحفظ اختياراتك، مثل اللغة واسم الحزمة والمؤلف، في متصفحك.</li><li><strong dir="ltr">web.whatsapp.com</strong> يتيح للإضافة إظهار لوحتها في واتساب ويب وإرسال الملصق في المحادثة المفتوحة.</li></ul><p>وحين تستورد رابط YouTube أو TikTok تستخدم الإضافة أيضاً:</p><ul><li><strong dir="ltr">youtube-nocookie.com</strong> و<strong dir="ltr">tiktok.com</strong> لتشغيل الفيديو من الرابط الذي تلصقه حتى تُسجَّل صورته وصوته.</li><li><strong dir="ltr">declarativeNetRequest</strong>، ويُستخدم فقط لضبط ترويسة Referer في طلبات تلك الفيديوهات، لأن هذين الموقعين يشترطانها لتشغيل الفيديو. لا يقرأ أي طلب آخر ولا يحجبه ولا يغيّره.</li></ul>',
      },
      {
        id: 'website',
        h2: 'هذا الموقع',
        html: '<ul><li>لا يستخدم الموقع أي تحليلات ولا ملفات تعريف ارتباط، ولا يحمّل شيئاً من مواقع أخرى: خطوطه تأتي من الموقع نفسه.</li><li>الموقع مستضاف على GitHub Pages، وكأي استضافة يصلها عنوان IP الخاص بك عند الزيارة؛ راجع <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">بيان خصوصية GitHub</a>.</li><li>إن اخترت الوضع الفاتح أو الداكن أو لغة ما، يُحفظ اختيارك في متصفحك فقط.</li></ul>',
      },
      { id: 'children', h2: 'الأطفال', html: '<p>صانع الملصقات الصوتية لا يجمع بيانات من أحد، بمن فيهم الأطفال.</p>' },
      {
        id: 'contact',
        h2: 'التغييرات والتواصل',
        html: `<p>إن تغيّرت هذه السياسة، تُنشر النسخة الجديدة في هذه الصفحة بتاريخ جديد. للأسئلة: افتح بلاغاً على ${issues}.</p>`,
      },
    ],
  },
  es: {
    title: 'Política de privacidad | Sound Sticker Maker',
    description:
      'Sound Sticker Maker no recoge datos. Tus imágenes y sonidos no salen de tu navegador: sin cuenta, sin analítica, sin subidas.',
    h1: 'Política de privacidad',
    date: 'Vigente desde el 27 de noviembre de 2026',
    lead: 'Sound Sticker Maker no recoge datos. Tus imágenes y sonidos se leen y se convierten en stickers dentro de tu navegador, y nunca salen de él.',
    summary: [
      { icon: 'user', t: 'Sin cuenta', b: 'No hay que registrarse.' },
      { icon: 'cloud', t: 'No se sube nada', b: 'Los archivos se quedan en tu navegador.' },
      { icon: 'eye', t: 'Sin analítica', b: 'Ni la extensión ni esta web te cuentan.' },
      { icon: 'code', t: 'Código abierto', b: 'Cada línea se puede leer en GitHub.' },
    ],
    toc: 'En esta página',
    sections: [
      {
        id: 'collect',
        h2: 'Qué recogemos',
        html: '<p>Nada. Ni la extensión ni esta web tienen cuentas, analítica, publicidad ni rastreo. No tenemos servidores que reciban tus datos, y no vendemos ni compartimos datos con nadie.</p>',
      },
      {
        id: 'files',
        h2: 'Tus imágenes y sonidos',
        html: `<ul><li>Los vídeos, GIF, imágenes y sonidos que eliges los lee y codifica tu navegador, en tu ordenador.</li><li>El sticker terminado va de tu navegador directamente a WhatsApp, igual que un sticker que envías tú. Lo que pasa después lo cubre la <a href="${wa}">política de privacidad de WhatsApp</a>.</li><li>El creador en línea de esta web funciona igual: los archivos que eliges no se envían a ningún sitio y el sticker que descargas se crea en la página.</li><li>Si importas ahí un enlace de YouTube o TikTok, la extensión reproduce el vídeo desde youtube-nocookie.com o lo descarga de tiktok.com, igual que si lo vieras en esos sitios. Solo se les envía la petición de ese vídeo.</li></ul>`,
      },
      {
        id: 'permissions',
        h2: 'Los permisos de la extensión',
        html: '<ul><li><strong>storage</strong> guarda tus preferencias, como el idioma, el nombre del paquete y el autor, en tu navegador.</li><li><strong>web.whatsapp.com</strong> permite que la extensión muestre su panel en WhatsApp Web y envíe el sticker al chat abierto.</li></ul><p>Cuando importas un enlace de YouTube o TikTok, la extensión usa además:</p><ul><li><strong>youtube-nocookie.com</strong> y <strong>tiktok.com</strong>, para reproducir el vídeo del enlace que pegas y grabar su imagen y su sonido.</li><li><strong>declarativeNetRequest</strong>, que solo pone la cabecera Referer en esas peticiones de vídeo, porque esos sitios la exigen para reproducirlo. No lee, bloquea ni cambia ninguna otra petición.</li></ul>',
      },
      {
        id: 'website',
        h2: 'Esta web',
        html: `<ul><li>La web no usa analítica ni cookies, y no carga nada de otros sitios: sus fuentes se sirven desde la propia web.</li><li>Está alojada en GitHub Pages, que, como cualquier alojamiento, recibe tu dirección IP cuando la visitas; consulta la <a href="${gh}">declaración de privacidad de GitHub</a>.</li><li>Si eliges modo claro u oscuro, o un idioma, esa elección se guarda solo en tu navegador.</li></ul>`,
      },
      { id: 'children', h2: 'Menores', html: '<p>Sound Sticker Maker no recoge datos de nadie, tampoco de menores.</p>' },
      {
        id: 'contact',
        h2: 'Cambios y contacto',
        html: `<p>Si esta política cambia, la nueva versión se publicará en esta página con una fecha nueva. ¿Preguntas? Abre una incidencia en ${issues}.</p>`,
      },
    ],
  },
  pt: {
    title: 'Política de privacidade | Sound Sticker Maker',
    description:
      'O Sound Sticker Maker não coleta dados. Suas imagens e sons não saem do navegador: sem conta, sem análise, sem envio de arquivos.',
    h1: 'Política de privacidade',
    date: 'Em vigor desde 27 de novembro de 2026',
    lead: 'O Sound Sticker Maker não coleta dados. Suas imagens e sons são lidos e viram figurinhas dentro do seu navegador, e nunca saem dele.',
    summary: [
      { icon: 'user', t: 'Sem conta', b: 'Nada para cadastrar.' },
      { icon: 'cloud', t: 'Nada é enviado', b: 'Os arquivos ficam no seu navegador.' },
      { icon: 'eye', t: 'Sem análise', b: 'Nem a extensão nem este site contam você.' },
      { icon: 'code', t: 'Código aberto', b: 'Cada linha pode ser lida no GitHub.' },
    ],
    toc: 'Nesta página',
    sections: [
      {
        id: 'collect',
        h2: 'O que coletamos',
        html: '<p>Nada. A extensão e este site não têm conta, análise, anúncios nem rastreamento. Não temos servidores que recebam seus dados, e não vendemos nem compartilhamos dados com ninguém.</p>',
      },
      {
        id: 'files',
        h2: 'Suas imagens e sons',
        html: `<ul><li>Os vídeos, GIFs, imagens e sons que você escolhe são lidos e codificados pelo navegador, no seu computador.</li><li>A figurinha pronta vai do seu navegador direto para o WhatsApp, como qualquer figurinha que você mesmo envia. O que acontece depois é coberto pela <a href="${wa}">política de privacidade do WhatsApp</a>.</li><li>O criador online deste site funciona do mesmo jeito: os arquivos que você escolhe não vão para lugar nenhum, e a figurinha que você baixa é criada na própria página.</li><li>Se você importar ali um link do YouTube ou do TikTok, a extensão toca o vídeo pelo youtube-nocookie.com ou busca no tiktok.com, como se você assistisse nesses sites. Só o pedido desse vídeo vai para eles.</li></ul>`,
      },
      {
        id: 'permissions',
        h2: 'As permissões da extensão',
        html: '<ul><li><strong>storage</strong> guarda suas escolhas, como idioma, nome do pacote e autor, no seu navegador.</li><li><strong>web.whatsapp.com</strong> permite que a extensão mostre o painel no WhatsApp Web e envie a figurinha na conversa aberta.</li></ul><p>Quando você importa um link do YouTube ou do TikTok, a extensão usa ainda:</p><ul><li><strong>youtube-nocookie.com</strong> e <strong>tiktok.com</strong>, para tocar o vídeo do link que você cola e gravar a imagem e o som.</li><li><strong>declarativeNetRequest</strong>, usado só para definir o cabeçalho Referer nesses pedidos de vídeo, que esses sites exigem para tocar. Ele não lê, bloqueia nem altera nenhum outro pedido.</li></ul>',
      },
      {
        id: 'website',
        h2: 'Este site',
        html: `<ul><li>O site não usa análise nem cookies, e não carrega nada de outros sites: as fontes vêm do próprio site.</li><li>Ele fica hospedado no GitHub Pages, que, como qualquer hospedagem, recebe seu endereço IP quando você visita; veja a <a href="${gh}">declaração de privacidade do GitHub</a>.</li><li>Se você escolher o modo claro ou escuro, ou um idioma, a escolha fica salva só no seu navegador.</li></ul>`,
      },
      { id: 'children', h2: 'Crianças', html: '<p>O Sound Sticker Maker não coleta dados de ninguém, inclusive de crianças.</p>' },
      {
        id: 'contact',
        h2: 'Mudanças e contato',
        html: `<p>Se esta política mudar, a nova versão será publicada nesta página com uma nova data. Dúvidas: abra uma issue no ${issues}.</p>`,
      },
    ],
  },
  id: {
    title: 'Kebijakan privasi | Sound Sticker Maker',
    description:
      'Sound Sticker Maker tidak mengumpulkan data apa pun. Gambar dan suara kamu tidak keluar dari browser: tanpa akun, tanpa analitik, tanpa unggahan.',
    h1: 'Kebijakan privasi',
    date: 'Berlaku sejak 27 November 2026',
    lead: 'Sound Sticker Maker tidak mengumpulkan data apa pun. Gambar dan suara kamu dibaca dan diubah menjadi stiker di dalam browser, dan tidak pernah keluar dari sana.',
    summary: [
      { icon: 'user', t: 'Tanpa akun', b: 'Tidak perlu mendaftar.' },
      { icon: 'cloud', t: 'Tidak ada unggahan', b: 'File tetap di browser kamu.' },
      { icon: 'eye', t: 'Tanpa analitik', b: 'Ekstensi dan situs ini tidak menghitung kamu.' },
      { icon: 'code', t: 'Open source', b: 'Setiap baris kodenya bisa dibaca di GitHub.' },
    ],
    toc: 'Di halaman ini',
    sections: [
      {
        id: 'collect',
        h2: 'Apa yang kami kumpulkan',
        html: '<p>Tidak ada. Ekstensi dan situs ini tidak punya akun, analitik, iklan, atau pelacakan. Kami tidak menjalankan server yang menerima data kamu, dan tidak menjual atau membagikan data kepada siapa pun.</p>',
      },
      {
        id: 'files',
        h2: 'Gambar dan suara kamu',
        html: `<ul><li>Video, GIF, gambar, dan suara yang kamu pilih dibaca dan diproses oleh browser di komputer kamu.</li><li>Stiker yang sudah jadi langsung dikirim dari browser ke WhatsApp, sama seperti stiker yang kamu kirim sendiri. Setelah itu berlaku <a href="${wa}">kebijakan privasi WhatsApp</a>.</li><li>Pembuat online di situs ini bekerja dengan cara yang sama: file yang kamu pilih tidak dikirim ke mana pun, dan stiker yang kamu unduh dibuat di halaman itu.</li><li>Kalau kamu mengimpor tautan YouTube atau TikTok di sana, ekstensi memutar videonya dari youtube-nocookie.com atau mengambilnya dari tiktok.com, sama seperti menontonnya di situs itu. Yang dikirim ke mereka hanya permintaan untuk video tersebut.</li></ul>`,
      },
      {
        id: 'permissions',
        h2: 'Izin yang dipakai ekstensi',
        html: '<ul><li><strong>storage</strong> menyimpan pilihan kamu, seperti bahasa, nama paket, dan pembuat, di browser.</li><li><strong>web.whatsapp.com</strong> memungkinkan ekstensi menampilkan panelnya di WhatsApp Web dan mengirim stiker ke obrolan yang terbuka.</li></ul><p>Saat kamu mengimpor tautan YouTube atau TikTok, ekstensi juga memakai:</p><ul><li><strong>youtube-nocookie.com</strong> dan <strong>tiktok.com</strong>, untuk memutar video dari tautan yang kamu tempel agar gambar dan suaranya bisa direkam.</li><li><strong>declarativeNetRequest</strong>, hanya untuk mengisi header Referer pada permintaan video tersebut, karena situs-situs itu mewajibkannya sebelum memutar video. Izin ini tidak membaca, memblokir, atau mengubah permintaan lain.</li></ul>',
      },
      {
        id: 'website',
        h2: 'Situs ini',
        html: `<ul><li>Situs ini tidak memakai analitik maupun cookie, dan tidak memuat apa pun dari situs lain: font-nya disajikan dari situs ini sendiri.</li><li>Situs ini di-host di GitHub Pages, yang seperti host web lainnya menerima alamat IP kamu saat berkunjung; lihat <a href="${gh}">Pernyataan Privasi GitHub</a>.</li><li>Kalau kamu memilih mode terang atau gelap, atau sebuah bahasa, pilihan itu hanya disimpan di browser kamu.</li></ul>`,
      },
      { id: 'children', h2: 'Anak-anak', html: '<p>Sound Sticker Maker tidak mengumpulkan data dari siapa pun, termasuk anak-anak.</p>' },
      {
        id: 'contact',
        h2: 'Perubahan dan kontak',
        html: `<p>Jika kebijakan ini berubah, versi barunya akan dimuat di halaman ini dengan tanggal baru. Ada pertanyaan? Buka issue di ${issues}.</p>`,
      },
    ],
  },
  hi: {
    title: 'प्राइवेसी पॉलिसी | Sound Sticker Maker',
    description: 'Sound Sticker Maker कोई डेटा इकट्ठा नहीं करता। आपकी तस्वीरें और आवाज़ें ब्राउज़र से बाहर नहीं जातीं: न अकाउंट, न एनालिटिक्स, न अपलोड।',
    h1: 'प्राइवेसी पॉलिसी',
    date: '27 नवंबर 2026 से लागू',
    lead: 'Sound Sticker Maker कोई डेटा इकट्ठा नहीं करता। आपकी तस्वीरें और आवाज़ें आपके ब्राउज़र के अंदर ही पढ़ी जाती हैं और स्टिकर बनती हैं, और वहाँ से बाहर नहीं जातीं।',
    summary: [
      { icon: 'user', t: 'कोई अकाउंट नहीं', b: 'साइन अप की ज़रूरत नहीं।' },
      { icon: 'cloud', t: 'कुछ अपलोड नहीं', b: 'फ़ाइलें आपके ब्राउज़र में रहती हैं।' },
      { icon: 'eye', t: 'कोई एनालिटिक्स नहीं', b: 'न एक्सटेंशन, न यह साइट आपको गिनती है।' },
      { icon: 'code', t: 'ओपन सोर्स', b: 'हर लाइन GitHub पर पढ़ी जा सकती है।' },
    ],
    toc: 'इस पेज पर',
    sections: [
      {
        id: 'collect',
        h2: 'हम क्या इकट्ठा करते हैं',
        html: '<p>कुछ नहीं। एक्सटेंशन और इस साइट में न अकाउंट है, न एनालिटिक्स, न विज्ञापन, न ट्रैकिंग। हमारा कोई सर्वर आपका डेटा नहीं लेता, और हम किसी को डेटा न बेचते हैं, न देते हैं।</p>',
      },
      {
        id: 'files',
        h2: 'आपकी तस्वीरें और आवाज़ें',
        html: `<ul><li>आप जो वीडियो, GIF, तस्वीरें और आवाज़ें चुनते हैं, उन्हें आपका ब्राउज़र आपके कंप्यूटर पर ही पढ़ता और प्रोसेस करता है।</li><li>तैयार स्टिकर आपके ब्राउज़र से सीधे WhatsApp पर जाता है, ठीक वैसे ही जैसे आपका ख़ुद भेजा स्टिकर। उसके बाद <a href="${wa}">WhatsApp की प्राइवेसी पॉलिसी</a> लागू होती है।</li><li>इस साइट का ऑनलाइन मेकर भी ऐसे ही काम करता है: आपकी चुनी फ़ाइलें कहीं नहीं भेजी जातीं, और डाउनलोड होने वाला स्टिकर पेज पर ही बनता है।</li><li>अगर आप वहाँ YouTube या TikTok लिंक इम्पोर्ट करते हैं, तो एक्सटेंशन वीडियो youtube-nocookie.com से चलाता है या tiktok.com से लाता है, ठीक वैसे जैसे आप उसे वहाँ देखते। उन्हें सिर्फ़ उस वीडियो की रिक्वेस्ट जाती है।</li></ul>`,
      },
      {
        id: 'permissions',
        h2: 'एक्सटेंशन की अनुमतियाँ',
        html: '<ul><li><strong>storage</strong> आपकी पसंद, जैसे भाषा, पैक का नाम और बनाने वाले का नाम, आपके ब्राउज़र में सहेजता है।</li><li><strong>web.whatsapp.com</strong> से एक्सटेंशन WhatsApp Web में अपना पैनल दिखा पाता है और खुली चैट में स्टिकर भेज पाता है।</li></ul><p>जब आप YouTube या TikTok लिंक इम्पोर्ट करते हैं, तो एक्सटेंशन ये भी इस्तेमाल करता है:</p><ul><li><strong>youtube-nocookie.com</strong> और <strong>tiktok.com</strong>, ताकि आपके पेस्ट किए लिंक का वीडियो चलाकर उसकी तस्वीर और आवाज़ रिकॉर्ड की जा सके।</li><li><strong>declarativeNetRequest</strong>, जो सिर्फ़ उन्हीं वीडियो रिक्वेस्ट में Referer हेडर लगाता है, क्योंकि ये साइटें वीडियो चलाने के लिए इसे माँगती हैं। यह किसी दूसरी रिक्वेस्ट को न पढ़ता है, न रोकता है, न बदलता है।</li></ul>',
      },
      {
        id: 'website',
        h2: 'यह साइट',
        html: `<ul><li>यह साइट न एनालिटिक्स इस्तेमाल करती है न कुकीज़, और किसी दूसरी साइट से कुछ लोड नहीं करती: इसके फ़ॉन्ट भी यहीं से आते हैं।</li><li>साइट GitHub Pages पर होस्ट है, जिसे किसी भी होस्ट की तरह आपके आने पर आपका IP पता मिलता है; देखें <a href="${gh}">GitHub का प्राइवेसी स्टेटमेंट</a>।</li><li>अगर आप लाइट या डार्क मोड, या कोई भाषा चुनते हैं, तो वह पसंद सिर्फ़ आपके ब्राउज़र में सहेजी जाती है।</li></ul>`,
      },
      { id: 'children', h2: 'बच्चे', html: '<p>Sound Sticker Maker किसी से भी डेटा इकट्ठा नहीं करता, बच्चों से भी नहीं।</p>' },
      {
        id: 'contact',
        h2: 'बदलाव और संपर्क',
        html: `<p>अगर यह पॉलिसी बदलती है, तो नया वर्ज़न नई तारीख़ के साथ इसी पेज पर डाला जाएगा। सवाल हों तो ${issues} पर issue खोलें।</p>`,
      },
    ],
  },
}
