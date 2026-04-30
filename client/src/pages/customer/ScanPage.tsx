import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UtensilsCrossed, RefreshCw, ArrowRight, Globe, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { api } from '@/services/api'
import type { Store } from '@qr-order/shared'

export default function ScanPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const session = useSessionStore()
  const clearCart = useCartStore(s => s.clearCart)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('customer')
  const [error, setError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(false)
  const [showLangModal, setShowLangModal] = useState(false)
  const [store, setStore] = useState<Store | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)

  const goToMenu = () => navigate(`/menu/${storeId}`, { replace: true })

  // Fetch store info (for announcement + logo)
  useEffect(() => {
    if (storeId) api.getStore(storeId).then(setStore).catch(() => {})
  }, [storeId])

  useEffect(() => {
    if (!storeId || !tableId) return

    // Fast path: same table, session exists → skip API, go straight to menu
    const isSameSession = session.storeId === storeId && session.tableId === tableId
    if (isSameSession) {
      goToMenu()
      return
    }

    // First visit: no language set → show language modal
    const hasLang = localStorage.getItem('i18n-lang')
    if (!hasLang) {
      setShowLangModal(true)
      return // wait for language selection before proceeding
    }

    // Language set → validate table and proceed
    initTable()
  }, [storeId, tableId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function initTable() {
    if (!storeId || !tableId) return
    try {
      const table = await api.getTable(storeId, tableId)
      if (table.enabled === false) {
        setDisabled(true)
        return
      }
      clearCart()
      session.setSession(storeId, tableId, table.name)
      goToMenu()
    } catch {
      session.setSession(storeId!, tableId!, '')
      setError(t('scan.error'))
    }
  }

  const selectLang = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('i18n-lang', lang)

    // Check for announcement
    const ann = lang === 'en' && store?.announcementEn
      ? store.announcementEn
      : store?.announcement
    if (ann?.trim()) {
      setAnnouncement(ann)
    } else {
      setShowLangModal(false)
      initTable()
    }
  }

  const dismissAnnouncement = () => {
    // Mark announcement as seen
    if (announcement && storeId) {
      const hash = Array.from(announcement).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36)
      localStorage.setItem(`announcement-hash-${storeId}`, hash.slice(0, 8))
    }
    setAnnouncement(null)
    setShowLangModal(false)
    initTable()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-primary/3 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            Digital Maître D&apos;
          </h1>
          <p className="text-xs text-muted-foreground tracking-[0.3em] mt-1">EST. 2024</p>
        </div>

        {disabled ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-center max-w-xs">{t('scan.disabled')}</p>
            <p className="text-xs text-muted-foreground text-center">{t('scan.disabledDesc')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-destructive text-center max-w-xs">{error}</p>
            <p className="text-xs text-muted-foreground text-center">{t('scan.retryDesc')}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />{t('scan.retry')}
              </Button>
              <Button onClick={goToMenu} className="gap-2">
                <ArrowRight className="w-4 h-4" />{t('scan.continue')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <UtensilsCrossed className="w-8 h-8 text-primary/60" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-primary">{t('scan.loading')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('scan.loadingZh')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 opacity-[0.03]">
        <UtensilsCrossed className="w-48 h-48 text-primary" />
      </div>

      {/* Language Selection Modal — first visit only */}
      <Dialog open={showLangModal} onOpenChange={() => {/* prevent dismiss without selection */}}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-0 gap-0 [&>button]:hidden">
          {announcement ? (
            /* Announcement view (after language selected) */
            <div className="flex flex-col items-center gap-5 p-6">
              {store?.logo && (
                <img src={store.logo} alt="" className="w-16 h-16 rounded-xl object-cover shadow-md" />
              )}
              <h2 className="text-lg font-bold text-primary text-center">
                {i18n.language === 'en' ? (store?.nameEn || store?.name) : store?.name}
              </h2>
              <div className="w-full bg-muted/50 rounded-xl p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{announcement}</p>
              </div>
              <button onClick={dismissAnnouncement}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
                {i18n.language === 'en' ? 'Start Ordering' : '开始点餐'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Language selection view */
            <div className="flex flex-col items-center gap-6 p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-primary">Select Language</h2>
                <p className="text-lg text-primary/80">选择语言</p>
              </div>
              <div className="w-full space-y-3">
                <button onClick={() => selectLang('zh')}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors group">
                  <div>
                    <p className="text-xl font-bold">中文</p>
                    <p className="text-xs text-white/70">Chinese</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button onClick={() => selectLang('en')}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-primary/20 bg-card hover:bg-primary/5 transition-colors group">
                  <div>
                    <p className="text-xl font-bold text-primary">English</p>
                    <p className="text-xs text-muted-foreground">International</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary/40 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
