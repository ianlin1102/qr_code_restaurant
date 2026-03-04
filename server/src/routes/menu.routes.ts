import { Router } from 'express'
import { getMenu } from '../services/menu.service.js'

const router = Router({ mergeParams: true })

router.get('/', (req, res) => {
  const menu = getMenu(req.params.storeId)
  if (!menu) {
    res.status(404).json({ error: 'Store not found' })
    return
  }
  res.json(menu)
})

export default router
