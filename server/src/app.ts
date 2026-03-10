import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import logger from './lib/logger.js'
import authRoutes from './routes/auth.routes.js'
import storeRoutes from './routes/store.routes.js'
import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/order.routes.js'
import tableRoutes from './routes/table.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

app.use(cors())
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
app.use('/api/stores/:storeId/tables', tableRoutes)

// Global error handler — must be after all routes
app.use(errorHandler)

export default app
