import type { Request, Response, RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import { withTenantContext, withPlatformContext } from '../repositories/prisma-client.js'
import logger from '../lib/logger.js'

/**
 * Augment Express.Locals (global namespace) to carry the transaction client
 * inside a tenant-scoped request.
 *
 * Why declare global namespace Express (not declare module
 * 'express-serve-static-core'):
 *   Under moduleResolution 'bundler' + ESM, the internal
 *   'express-serve-static-core' module path is not directly resolvable for
 *   augmentation. Augmenting the global Express namespace is the
 *   @types/express v4/v5 stable pattern that does not depend on internal
 *   module path resolution.
 *
 * Note: @types/express ^5.0.0 vs express ^4.21.0 version skew documented for
 *       Phase H reconcile (D80 candidate). Global namespace augmentation
 *       works under both versions.
 */
declare global {
  namespace Express {
    interface Locals {
      tx?: Prisma.TransactionClient
      storeId?: string
      platformAdminId?: string
      /**
       * Register a callback to fire AFTER the request's tenant/platform tx
       * commits successfully. Rule 2 enforcement path for SSE emit and
       * similar post-commit side effects.
       *
       * Semantics:
       *   - tx throws → hooks NEVER fire (correct: rollback = no events)
       *   - hook throws → logged, other hooks still fire, response not broken
       *   - hooks fire in registration order (FIFO)
       *
       * Undefined outside a tenant/platformAwareRoute scope.
       */
      afterCommit?: (hook: () => void | Promise<void>) => void
    }
  }
}

export type TenantAwareHandler = (req: Request, res: Response) => Promise<void>

/**
 * Wrap an async route handler so it runs inside withTenantContext.
 * - Reads storeId from req.params.storeId (required — route pattern must include :storeId)
 * - Opens tx + sets RLS store context
 * - Exposes tx on res.locals.tx for handler + repos to use
 * - Exposes afterCommit(hook) on res.locals for rule-2-compliant emits
 * - Any exception propagates to Express error middleware (tx auto-rollback)
 *
 * Usage:
 *   router.get('/orders', tenantAwareRoute(async (req, res) => {
 *     const orders = await orderRepo.findSubmitted({ storeId: res.locals.storeId }, res.locals.tx)
 *     res.json(orders)
 *   }))
 *
 *   // With SSE emit (rule 2):
 *   router.post('/orders', tenantAwareRoute(async (req, res) => {
 *     const order = await orderRepo.createDraftOrder(..., res.locals.tx)
 *     res.locals.afterCommit!(() => emit({ type: 'order:created', storeId, orderId: order.id }))
 *     res.json(order)
 *   }))
 */
export function tenantAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    // @types/express v5: req.params[k] is string | string[] (supports
    // array-style params like /path/:id+). We require single string — narrow
    // with typeof guard, not unsafe `as string` cast.
    const rawStoreId = req.params.storeId
    if (typeof rawStoreId !== 'string') {
      res.status(400).json({ error: 'storeId missing or invalid in route' })
      return
    }
    const storeId = rawStoreId
    const hooks: Array<() => void | Promise<void>> = []
    try {
      await withTenantContext(storeId, async (tx) => {
        res.locals.tx = tx
        res.locals.storeId = storeId
        res.locals.afterCommit = (hook: () => void | Promise<void>) => { hooks.push(hook) }
        await handler(req, res)
      })
      // tx committed — fire hooks in registration order.
      // Errors here are logged, not propagated: the response is already
      // sent / sending, and the tx is durable. Event loss is degrade-only.
      for (const hook of hooks) {
        try {
          await hook()
        } catch (err) {
          logger.error({ err }, 'afterCommit hook failed (tx already committed)')
        }
      }
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Wrap a platform-admin route handler so it runs inside withPlatformContext
 * (SET LOCAL ROLE platform_admin, BYPASSRLS).
 *
 * The route middleware chain must have already verified PlatformAdmin JWT
 * and set res.locals.platformAdminId before this handler runs.
 *
 * Same afterCommit semantics as tenantAwareRoute.
 */
export function platformAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    if (!res.locals.platformAdminId) {
      res.status(403).json({ error: 'platform admin auth required' })
      return
    }
    const hooks: Array<() => void | Promise<void>> = []
    try {
      await withPlatformContext(async (tx) => {
        res.locals.tx = tx
        res.locals.afterCommit = (hook: () => void | Promise<void>) => { hooks.push(hook) }
        await handler(req, res)
      })
      for (const hook of hooks) {
        try {
          await hook()
        } catch (err) {
          logger.error({ err }, 'afterCommit hook failed (platform tx already committed)')
        }
      }
    } catch (err) {
      next(err)
    }
  }
}
