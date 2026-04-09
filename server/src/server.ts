import 'dotenv/config'
import app from './app.js'
import { startAutoCloseTimer } from './settlement/auto-close.js'
import { startEventRouter } from './lib/sse.js'

const PORT = 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  startAutoCloseTimer()
  startEventRouter()
})
