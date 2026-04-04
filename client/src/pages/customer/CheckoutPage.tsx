import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import TipSelector, { type TipSelection } from '@/components/shared/TipSelector'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

type Settlement = { type: 'by-item'; itemKeys: string[] } | { type: 'by-percent'; percent: number }
type RouteState = {
  clientSecret?: string; amount?: number; tableId?: string
  items?: { menuItemId: string; quantity: number; remark?: string; selectedOptions?: unknown[] }[]
  sessionId?: string; settlement?: Settlement
} | null

function CheckoutForm({ amount, items }: { amount: number; items: { name: string; quantity: number; price: number; selectedOptions?: { choiceName: string; choiceNameEn?: string }[] }[] }) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation('customer')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentReady, setPaymentReady] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/confirm`,
      },
    })

    if (result.error) {
      setError(result.error.message || t('checkout.paymentFailed'))
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="text-center space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">{t('checkout.amountDue')}</p>
          <p className="text-5xl font-bold text-primary">{formatPriceUSD(amount)}</p>
        </div>

        {items.length > 0 && (
          <div className="bg-background rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">ORDER SUMMARY</p>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.name} x{item.quantity}
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <span className="text-xs text-orange-600 ml-1">
                      ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || "")).join(', ')})
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">{formatPriceUSD((item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)) * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        {!paymentReady && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t('checkout.loadingPayment')}</span>
          </div>
        )}
        <PaymentElement onReady={() => setPaymentReady(true)} />

        <div className="flex items-center justify-center gap-1.5 text-green-600 text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
          <span>{t('checkout.securePayment')}</span>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={!stripe || processing}
          className="w-full min-h-[44px] bg-primary hover:bg-primary/90 text-base"
        >
          {processing ? t('checkout.processing') : t('checkout.pay', { amount: formatPriceUSD(amount) })}
        </Button>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { storeId, tableName } = useSessionStore()

  const state = location.state as RouteState
  const clientSecret = state?.clientSecret
  const amount = state?.amount ?? 0
  const cartItems = useCartStore(s => s.items)

  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  const [tipSelection, setTipSelection] = useState<TipSelection | null>(null)
  const [activeSecret, setActiveSecret] = useState(clientSecret)
  const [activeAmount, setActiveAmount] = useState(amount)
  const [loadingTip, setLoadingTip] = useState(false)

  const applyTip = async (sel: TipSelection | null) => {
    setTipSelection(sel)
    if (!storeId || !state?.tableId) return
    let tip = 0
    if (sel?.type === 'percent') {
      tip = Math.round(amount * sel.pct / 100)
    } else if (sel?.type === 'custom') {
      tip = sel.amount
    }
    setLoadingTip(true)
    try {
      let result: { clientSecret: string; amount: number }
      if (state.sessionId) {
        // Pay-later: recreate session PaymentIntent with tip added to amount
        result = await api.createCheckoutForSession(storeId, state.sessionId, amount + tip, state.settlement)
      } else if (state.items) {
        // Pay-first: recreate cart PaymentIntent with tipAmount
        result = await api.createCheckout(storeId, {
          tableId: state.tableId, items: state.items, tipAmount: tip,
        })
      } else return
      setActiveSecret(result.clientSecret)
      setActiveAmount(result.amount)
    } catch { /* keep original */ }
    finally { setLoadingTip(false) }
  }

  if (!activeSecret) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold mb-2">{t('checkout.noSession')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('checkout.noSessionDesc')}
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('checkout.backToMenu')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-8 pb-safe">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">
          {lang === 'zh' ? '结账' : 'Checkout'}
          <span className="text-muted-foreground font-normal text-lg ml-2">
            / {lang === 'zh' ? 'Checkout' : '结账'}
          </span>
        </h1>
        {tableName && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full">
              {tableName}
            </span>
          </div>
        )}

        <TipSelector
          baseAmount={amount}
          selected={tipSelection}
          onSelect={applyTip}
          loadingTip={loadingTip}
        />

        <Elements stripe={stripePromise} options={{ clientSecret: activeSecret!, locale: lang === 'zh' ? 'zh' : 'en' }} key={activeSecret}>
          <CheckoutForm amount={activeAmount} items={cartItems} />
        </Elements>
      </div>
    </div>
  )
}
