import { Router } from 'express'
import { getTables } from '../services/table.service.js'

const router = Router({ mergeParams: true })

router.get('/', (req, res) => {
  const tables = getTables(req.params.storeId)
  res.json(tables)
})

export default router
