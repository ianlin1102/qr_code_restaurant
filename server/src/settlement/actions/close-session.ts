import type { SettlementContext } from '../types'
import { checkNotClosed, checkIsPaid } from '../rules'
import { closeSession } from '../../controllers/session.service'

export function execute(ctx: SettlementContext) {
  const checks = [checkNotClosed(ctx), checkIsPaid(ctx)]
  for (const code of checks) {
    if (code) return { error: code, message: code === 'SESSION_CLOSED' ? 'Session already closed' : 'Session not fully paid' }
  }

  const result = closeSession(ctx.store.id, ctx.session.id)
  if ('error' in result) return { error: 'SESSION_NOT_FULLY_PAID', message: result.error }

  return { data: {} }
}
