import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import logger from '../lib/logger.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message
    return res.status(400).json({ error: msg })
  }
  if (err.message === 'Only JPEG and PNG images are allowed') {
    return res.status(400).json({ error: err.message })
  }

  logger.error({ err, stack: err.stack }, 'unhandled error')
  res.status(500).json({ error: 'Internal server error' })
}
