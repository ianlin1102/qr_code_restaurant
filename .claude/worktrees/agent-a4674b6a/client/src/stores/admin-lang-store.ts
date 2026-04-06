import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/i18n/admin'

interface AdminLangStore {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

export const useAdminLangStore = create<AdminLangStore>()(
  persist(
    (set, get) => ({
      lang: 'zh',
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === 'zh' ? 'en' : 'zh' }),
    }),
    { name: 'admin-lang' }
  )
)
