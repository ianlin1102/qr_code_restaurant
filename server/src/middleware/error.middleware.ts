import type { Request, Response, NextFunction } from 'express'
import logger from '../lib/logger.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err, stack: err.stack }, 'unhandled error')

  res.status(500).json({ error: 'Internal server error' })
}
