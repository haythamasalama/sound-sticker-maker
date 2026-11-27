import easyshoot from '../assets/apps/easyshoot.svg?raw'
import prSift from '../assets/apps/pr-sift.svg?raw'
import runarks from '../assets/apps/runarks.svg?raw'
import wbm from '../assets/apps/whatsapp-business-monitor.svg?raw'
import type { Lang } from './index'

export const SIBLINGS_LABEL: Record<Lang, string> = {
  en: 'Sibling apps',
  ar: 'تطبيقات شقيقة',
  es: 'Apps hermanas',
  pt: 'Apps irmãos',
  id: 'Aplikasi saudara',
  hi: 'दूसरे ऐप्स',
}

export const SIBLING_APPS: { name: string; logo: string; url: string; about: Record<Lang, string> }[] = [
  {
    name: 'EasyShoot',
    logo: easyshoot,
    url: 'https://easyshoot.app/',
    about: {
      en: 'Screenshot app for Mac',
      ar: 'تطبيق لقطات الشاشة للماك',
      es: 'App de capturas de pantalla para Mac',
      pt: 'App de captura de tela para Mac',
      id: 'Aplikasi tangkapan layar untuk Mac',
      hi: 'Mac के लिए स्क्रीनशॉट ऐप',
    },
  },
  {
    name: 'PR Sift',
    logo: prSift,
    url: 'https://pr-sift.haythamasalama.me/',
    about: {
      en: 'Review big GitHub pull requests',
      ar: 'لمراجعة طلبات السحب الكبيرة على GitHub',
      es: 'Revisa pull requests grandes de GitHub',
      pt: 'Revise pull requests grandes no GitHub',
      id: 'Tinjau pull request GitHub yang besar',
      hi: 'GitHub के बड़े pull request रिव्यू करें',
    },
  },
  {
    name: 'Runarks',
    logo: runarks,
    url: 'https://runarks.com/',
    about: {
      en: 'Governed access to production',
      ar: 'وصول محكوم إلى بيئة الإنتاج',
      es: 'Acceso controlado a producción',
      pt: 'Acesso controlado à produção',
      id: 'Akses produksi yang terkendali',
      hi: 'प्रोडक्शन तक नियंत्रित पहुँच',
    },
  },
  {
    name: 'WhatsApp Business Monitor',
    logo: wbm,
    url: 'https://wbm.haythamasalama.me/',
    about: {
      en: 'Open-source WhatsApp dashboard',
      ar: 'لوحة واتساب مفتوحة المصدر',
      es: 'Panel de WhatsApp de código abierto',
      pt: 'Painel de WhatsApp de código aberto',
      id: 'Dasbor WhatsApp open source',
      hi: 'ओपन-सोर्स WhatsApp डैशबोर्ड',
    },
  },
]
