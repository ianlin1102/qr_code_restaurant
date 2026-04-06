import { Router } from 'express'
import { login } from '../controllers/auth.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router({ mergeParams: true })

// POST /api/stores/:storeId/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const result = await login(req.params.storeId, username, password)
  if ('error' in result) {
    return res.status(result.status).json({ error: result.error })
  }
  res.json(result.data)
})

// GET /api/stores/:storeId/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
