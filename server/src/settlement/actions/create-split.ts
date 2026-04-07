import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkItemKeys, checkPercent, checkMinimum } from '../rules'
import { createSplitBill } from '../../controllers/split-bill.service'

export function execute(ctx: SettlementContext, action: {
  type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string
}) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx) }
  }

  if (action.splitType === 'by-item') {
    const modeCheck = checkModeCompatible(ctx, 'by-item')
    if (modeCheck) return { error: modeCheck, message: `Cannot create by-item split: session is in ${ctx.session.settlementMode} mode` }

    if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
      return { error: 'INVALID_ITEM_KEY', message: 'itemKeys required for by-item split' }
    }
    const itemCheck = checkItemKeys(ctx, action.itemKeys, true, true)
    if (itemCheck) return { error: itemCheck, message: errorMessage(itemCheck, ctx) }
  } else {
    const modeCheck = checkModeCompatible(ctx, 'by-percent')
    if (modeCheck) return { error: modeCheck, message: `Cannot create by-percent split: session is in ${ctx.session.settlementMode} mode` }

    const pctCheck = checkPercent(action.percent)
    if (pctCheck) return { error: pctCheck, message: 'Percent must be between 1 and 100' }
  }

  const result = createSplitBill(ctx.store.id, ctx.session.id, {
    type: action.splitType,
    itemKeys: action.itemKeys,
    percent: action.percent ? Math.round(action.percent) : undefined,
    label: action.label,
  })
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { splitBill: result } }
}

function errorMessage(code: string, ctx: SettlementContext): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Mode conflict: session is in ${ctx.session.settlementMode} mode`
    case 'ITEM_ALREADY_PAID': return 'Some items have already been paid'
    case 'ITEM_ALREADY_ASSIGNED': return 'Some items are already assigned to another split'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining after split must be at least $1.00'
    default: return code
  }
}
