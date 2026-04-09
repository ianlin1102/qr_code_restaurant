import { Router } from 'express'
import type { Request, Response } from 'express'
import { addClient } from '../lib/sse'

const router = Router({ mergeParams: true })

// Session-scoped SSE: customer + admin watching one session
// GET /api/stores/:storeId/sessions/:sessionId/events
router.get('/sessions/:sessionId/events', (req: Request, res: Response) => {
  const { storeId, sessionId } = req.params
  addClient(res, storeId as string, sessionId as string)
})

// Store-scoped SSE: admin watching all tables/orders
// GET /api/stores/:storeId/events
router.get('/events', (req: Request, res: Response) => {
  const { storeId } = req.params
  addClient(res, storeId as string)
})

export default router
