import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkItemKeys, checkMinimum } from '../rules'
import { payByItems } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'pay-items'; itemKeys: string[] }) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkModeCompatible(ctx, 'by-item'),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx) }
  }

  if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
    return { error: 'INVALID_ITEM_KEY', message: 'itemKeys array required' }
  }

  const itemCheck = checkItemKeys(ctx, action.itemKeys, true, false)
  if (itemCheck) return { error: itemCheck, message: errorMessage(itemCheck, ctx) }

  const result = payByItems(ctx.store.id, ctx.session.id, action.itemKeys)
  if ('error' in result) return { error: 'INVALID_ITEM_KEY', message: result.error }

  const minCheck = checkMinimum(result.amount, ctx.remaining - result.amount, false)
  if (minCheck) return { error: minCheck, message: errorMessage(minCheck, ctx) }

  return { data: result }
}

function errorMessage(code: string, ctx: SettlementContext): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Cannot pay by items: session is in ${ctx.session.settlementMode} mode`
    case 'ITEM_ALREADY_PAID': return 'Some items have already been paid'
    case 'INVALID_ITEM_KEY': return 'Invalid item reference'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining balance after split must be at least $1.00'
    default: return code
  }
}
