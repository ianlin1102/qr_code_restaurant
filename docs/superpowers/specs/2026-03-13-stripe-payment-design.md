# Stripe Payment Integration Design

## Status Flow
```
pending → paid → preparing → completed
```

## Type Changes (shared/types.ts)
- Order.status: add `'paid'`
- Order.paymentIntentId?: string

## Backend

### New Files
| File | Purpose |
|------|---------|
| server/src/lib/stripe.ts | Init Stripe client from env |
| server/src/controllers/payment.service.ts | createCheckoutSession(orderId, storeId) → { clientSecret, amount } |
| server/src/routes/payment.routes.ts | POST /api/stores/:storeId/orders/:orderId/checkout |
| server/src/routes/webhook.routes.ts | POST /api/webhook/stripe (raw body, no JWT) |

### Webhook Raw Body
Register webhook route BEFORE express.json() in app.ts using express.raw({type:'application/json'}).

### Payment Flow
1. Frontend calls POST /orders/:orderId/checkout
2. Backend validates order belongs to storeId, status is 'pending'
3. Creates Stripe PaymentIntent (amount from order.totalPrice, currency 'usd')
4. Stores paymentIntentId on order
5. Returns { clientSecret, amount }

### Webhook Flow
1. Stripe sends payment_intent.succeeded
2. Verify signature with STRIPE_WEBHOOK_SECRET
3. Find order by paymentIntentId
4. Update status to 'paid'

## Frontend

### New Files
| File | Purpose |
|------|---------|
| client/src/pages/customer/CheckoutPage.tsx | Stripe Elements payment form |

### Route
/store/:storeId/checkout/:orderId → CheckoutPage

### Flow
CartPage (place order) → CheckoutPage (pay) → OrderConfirmPage (success)

### Dependencies
@stripe/stripe-js, @stripe/react-stripe-js

## Environment Variables
- STRIPE_SECRET_KEY (server)
- STRIPE_WEBHOOK_SECRET (server, optional initially)
- VITE_STRIPE_PUBLISHABLE_KEY (client)
