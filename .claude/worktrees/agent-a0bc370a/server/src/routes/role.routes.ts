import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import * as roleService from '../controllers/role.service.js'
import type { Request, Response } from 'express'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requirePermission('staff:manage'), (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const roles = roleService.getRoles(storeId)
  res.json(roles)
})

router.post('/', requireAuth, requirePermission('staff:manage'), (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const { name, nameEn, permissions } = req.body
  if (!name || !permissions) {
    return res.status(400).json({ error: 'name and permissions are required' })
  }
  const role = roleService.createRole(storeId, name, nameEn, permissions)
  res.status(201).json(role)
})

router.put('/:roleId', requireAuth, requirePermission('staff:manage'), (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const roleId = req.params.roleId as string
  const result = roleService.updateRole(storeId, roleId, req.body)
  if ('error' in result) return res.status(400).json(result)
  res.json(result)
})

router.delete('/:roleId', requireAuth, requirePermission('staff:manage'), (req: Request, res: Response) => {
  const storeId = req.params.storeId as string
  const roleId = req.params.roleId as string
  const result = roleService.deleteRole(storeId, roleId)
  if ('error' in result) return res.status(400).json(result)
  res.json(result)
})

export default router
