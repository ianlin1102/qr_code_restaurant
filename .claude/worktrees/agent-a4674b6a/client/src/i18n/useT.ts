import { useAdminLangStore } from '@/stores/admin-lang-store'
import { adminT } from './admin'

export type T = typeof adminT.en

export function useT() {
  const { lang, toggle, setLang } = useAdminLangStore()
  const t = adminT[lang] as T
  return { t, lang, toggle, setLang }
}
