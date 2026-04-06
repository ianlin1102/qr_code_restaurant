import type { Request, Response, NextFunction } from 'express'
import type { Permission } from '@qr-order/shared'
import { resolvePermissions } from '../controllers/role.service.js'

export function requirePermission(...perms: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Use permissions from JWT if available (new tokens)
    let userPerms = req.user.permissions

    // Fallback: resolve from role for legacy tokens
    if (!userPerms) {
      userPerms = resolvePermissions(
        req.user.storeId,
        req.user.roleId,
        req.user.role
      )
    }

    const hasAll = perms.every(p => userPerms!.includes(p))
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}
