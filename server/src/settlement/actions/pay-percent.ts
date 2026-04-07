import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkPercent, checkMinimum } from '../rules'
import { payByPercent } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'pay-percent'; percent: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkModeCompatible(ctx, 'by-percent'),
    checkPercent(action.percent),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx, action.percent) }
  }

  const percent = Math.round(Math.max(1, Math.min(100, action.percent)))
  const result = payByPercent(ctx.store.id, ctx.session.id, percent)
  if ('error' in result) return { error: 'INVALID_PERCENT', message: result.error }

  return { data: result }
}

function errorMessage(code: string, ctx: SettlementContext, percent?: number): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Cannot pay by percent: session is in ${ctx.session.settlementMode} mode`
    case 'INVALID_PERCENT': return 'Percent must be between 1 and 100'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining balance after split must be at least $1.00'
    default: return code
  }
}
