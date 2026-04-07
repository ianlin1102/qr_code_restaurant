import logger from '../lib/logger'
import type { SettlementAction, SettlementResult, SettlementContext } from './types'

export function logSettlement(
  ctx: SettlementContext,
  action: SettlementAction,
  result: SettlementResult,
) {
  const base = {
    store: ctx.session.storeId,
    session: ctx.session.id,
    table: ctx.session.tableId,
    action: action.type,
  }

  if (result.ok) {
    logger.info({
      ...base,
      status: 'OK',
      remaining: result.remaining,
      sessionStatus: result.sessionStatus,
    }, `[SETTLEMENT] ${action.type} succeeded`)
  } else {
    logger.warn({
      ...base,
      status: 'REJECTED',
      code: result.code,
      message: result.message,
    }, `[SETTLEMENT] ${action.type} rejected: ${result.code}`)
  }
}
