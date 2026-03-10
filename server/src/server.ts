import 'dotenv/config'
import app from './app.js'

const PORT = 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} HELLO FROM IAN, THIS is the second times`)
})
