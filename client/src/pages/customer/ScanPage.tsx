import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UtensilsCrossed, RefreshCw } from 'lucide-react'
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

  useEffect(() => {
    if (!storeId || !tableId) return
    async function init() {
      try {
        const table = await api.getTable(storeId!, tableId!)
        const isSameSession = session.storeId === storeId && session.tableId === tableId
        if (!isSameSession) clearCart()
        const hasLang = localStorage.getItem('i18n-lang')
        if (!hasLang) { navigate(`/lang-select/${storeId}/${tableId}`, { replace: true }); return }
        session.setSession(storeId!, tableId!, table.name)
        navigate(`/menu/${storeId}`, { replace: true })
      } catch { setError(t('scan.error')) }
    }
    init()
  }, [storeId, tableId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-10%] left-[-5%] w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-primary/3 blur-3xl" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            Digital Maître D'
          </h1>
          <p className="text-xs text-muted-foreground tracking-[0.3em] mt-1">EST. 2024</p>
        </div>

        {/* Spinner or Error */}
        {error ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-destructive text-center max-w-xs">{error}</p>
            <p className="text-xs text-muted-foreground text-center">{t('scan.retryDesc')}</p>
            <Button onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 gap-2">
              <RefreshCw className="w-4 h-4" />{t('scan.retry')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* Custom spinner */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <UtensilsCrossed className="w-8 h-8 text-primary/60" />
              </div>
            </div>
            {/* Bilingual loading text */}
            <div className="text-center">
              <p className="text-sm font-medium text-primary">{t('scan.loading')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('scan.loadingZh')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Watermark */}
      <div className="absolute bottom-8 opacity-[0.03]">
        <UtensilsCrossed className="w-48 h-48 text-primary" />
      </div>
    </div>
  )
}
