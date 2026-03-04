import express from 'express'
import cors from 'cors'
import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/order.routes.js'
import tableRoutes from './routes/table.routes.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/stores/:storeId/menu', menuRoutes)
app.use('/api/stores/:storeId/orders', orderRoutes)
app.use('/api/stores/:storeId/tables', tableRoutes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
