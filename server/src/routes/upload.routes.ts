import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import { uploadToS3 } from '../lib/s3.js'

const router = Router()

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG images are allowed'))
    }
    cb(null, true)
  },
})

router.post(
  '/upload',
  requireAuth,
  requirePermission('menu:write'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' })
      }
      const url = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      )
      res.json({ url })
    } catch (err) {
      next(err)
    }
  },
)

export default router
