import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ amount }: { amount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(result.error.message || 'Payment failed')
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Amount Due</p>
          <p className="text-3xl font-bold">{formatPriceUSD(amount)}</p>
        </div>

        <PaymentElement />

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={!stripe || processing}
          className="w-full min-h-[44px]"
        >
          {processing ? 'Processing...' : `Pay ${formatPriceUSD(amount)}`}
        </Button>
      </Card>
    </form>
  )
}

export default function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { storeId } = useSessionStore()

  // clientSecret and amount passed via route state from CartPage
  const state = location.state as { clientSecret?: string; amount?: number } | null
  const clientSecret = state?.clientSecret
  const amount = state?.amount ?? 0

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold mb-2">No checkout session</h2>
        <p className="text-muted-foreground text-center mb-4">
          Please go back to your cart to start checkout.
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          Back to menu
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-8 pb-safe">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Payment</h1>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm amount={amount} />
        </Elements>
      </div>
    </div>
  )
}
