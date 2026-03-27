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
import webhookRoutes from './routes/webhook.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import couponRoutes from './routes/coupon.routes.js'
import waitlistRoutes from './routes/waitlist.routes.js'
import printerRoutes from './routes/printer.routes.js'
import staffRoutes from './routes/staff.routes.js'
import billRoutes from './routes/bill.routes.js'
import roleRoutes from './routes/role.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

app.use(cors())

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes)

// Parse JSON for all other routes
app.use(express.json())
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
app.use('/api/stores/:storeId/tables', tableRoutes)
app.use('/api/stores/:storeId/bills', billRoutes)
app.use('/api/stores/:storeId/analytics', analyticsRoutes)
app.use('/api/stores/:storeId/coupons', couponRoutes)
app.use('/api/stores/:storeId/waitlist', waitlistRoutes)
app.use('/api/stores/:storeId/printer', printerRoutes)
app.use('/api/stores/:storeId/staff', staffRoutes)
app.use('/api/stores/:storeId/roles', roleRoutes)
app.use('/api', uploadRoutes)

// Global error handler — must be after all routes
app.use(errorHandler)

export default app
