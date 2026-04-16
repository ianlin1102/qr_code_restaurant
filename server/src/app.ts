import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import logger from './lib/logger.js'
import authRoutes from './routes/auth.routes.js'
import storeRoutes from './routes/store.routes.js'
import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/order.routes.js'
import tableRoutes from './routes/table.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import paymentAdjustRoutes from './routes/payment-adjust.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import couponRoutes from './routes/coupon.routes.js'
import waitlistRoutes from './routes/waitlist.routes.js'
import printerRoutes from './routes/printer.routes.js'
import staffRoutes from './routes/staff.routes.js'
import clockRoutes from './routes/clock.routes.js'
import sessionRoutes from './routes/session.routes.js'
import roleRoutes from './routes/role.routes.js'
import splitBillRoutes from './routes/split-bill.routes.js'
import sseRoutes from './routes/sse.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}))

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes)

// Parse JSON for all other routes
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev', {
  stream: { write: (msg: string) => logger.info(msg.trimEnd()) },
}))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes (no auth required)
app.use('/api/stores/:storeId/auth', authRoutes)

// Business routes (auth applied per-endpoint inside route files)
app.use('/api/stores/:storeId', storeRoutes)
app.use('/api/stores/:storeId/menu', menuRoutes)
app.use('/api/stores/:storeId/orders', orderRoutes)
app.use('/api/stores/:storeId/checkout', paymentRoutes)
app.use('/api/stores/:storeId/payments', paymentAdjustRoutes)
app.use('/api/stores/:storeId/tables', tableRoutes)
// SSE must be before session routes (Express matches in mount order)
app.use('/api/stores/:storeId', sseRoutes)
app.use('/api/stores/:storeId/sessions', sessionRoutes)
app.use('/api/stores/:storeId/sessions/:sessionId/split-bills', splitBillRoutes)
app.use('/api/stores/:storeId/analytics', analyticsRoutes)
app.use('/api/stores/:storeId/coupons', couponRoutes)
app.use('/api/stores/:storeId/waitlist', waitlistRoutes)
app.use('/api/stores/:storeId/printer', printerRoutes)
app.use('/api/stores/:storeId/staff', staffRoutes)
app.use('/api/stores/:storeId/clock', clockRoutes)
app.use('/api/stores/:storeId/roles', roleRoutes)
app.use('/api', uploadRoutes)

// Global error handler — must be after all routes
app.use(errorHandler)

export default app
