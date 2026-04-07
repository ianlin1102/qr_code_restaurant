import type { SettlementContext } from '../types'
import { checkIsClosed } from '../rules'
import { reopenSession } from '../../controllers/session.service'

export function execute(ctx: SettlementContext) {
  const code = checkIsClosed(ctx)
  if (code) return { error: code, message: 'Session is not closed' }

  const result = reopenSession(ctx.store.id, ctx.session.id)
  if ('error' in result) return { error: 'SESSION_NOT_CLOSED', message: result.error }

  return { data: {} }
}
