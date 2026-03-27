import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../controllers/auth.service.js'
import type { JwtPayload } from '@qr-order/shared'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  const token = header.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Multi-tenant isolation: token storeId must match URL storeId
  if (req.params.storeId && payload.storeId !== req.params.storeId) {
    return res.status(403).json({ error: 'Store access denied' })
  }

  req.user = payload
  next()
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    const payload = verifyToken(token)
    if (payload && (!req.params.storeId || payload.storeId === req.params.storeId)) {
      req.user = payload
    }
  }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
