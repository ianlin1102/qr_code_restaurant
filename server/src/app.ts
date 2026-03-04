import express from 'express'
import cors from 'cors'
import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/order.routes.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/stores/:storeId/menu', menuRoutes)
app.use('/api/stores/:storeId/orders', orderRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
