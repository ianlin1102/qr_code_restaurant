import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UtensilsCrossed, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { api } from '@/services/api'

export default function ScanPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const session = useSessionStore()
  const clearCart = useCartStore(s => s.clearCart)
  const navigate = useNavigate()
  const { t } = useTranslation('customer')
  const [error, setError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(false)

  const goToMenu = () => navigate(`/menu/${storeId}`, { replace: true })

  useEffect(() => {
    if (!storeId || !tableId) return

    // Fast path: same table, session exists → skip API, go straight to menu
    const isSameSession = session.storeId === storeId && session.tableId === tableId
    if (isSameSession) {
      goToMenu()
      return
    }

    // Ensure language is set
    const hasLang = localStorage.getItem('i18n-lang')
    if (!hasLang) {
      navigate(`/lang-select/${storeId}/${tableId}`, { replace: true })
      return
    }

    // New table — validate via API
    async function init() {
      try {
        const table = await api.getTable(storeId!, tableId!)
        if (table.enabled === false) {
          setDisabled(true)
          return
        }
        clearCart()
        session.setSession(storeId!, tableId!, table.name)
        goToMenu()
      } catch {
        // API failed but we can still set session and try
        session.setSession(storeId!, tableId!, '')
        setError(t('scan.error'))
      }
    }
    init()
  }, [storeId, tableId]) // eslint-disable-line react-hooks/exhaustive-deps

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
              <Button onClick={() => window.location.reload()}
                variant="outline" className="gap-2">
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
    </div>
  )
}
