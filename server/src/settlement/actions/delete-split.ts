import type { SettlementContext } from '../types'
import { checkNotClosed, checkSplitExists, checkSplitUnpaid } from '../rules'
import { deleteSplitBill } from '../../controllers/split-bill.service'

export function execute(ctx: SettlementContext, action: { type: 'delete-split'; splitBillId: string }) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const result = deleteSplitBill(ctx.store.id, action.splitBillId)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: {} }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SPLIT_NOT_FOUND': return 'Split bill not found'
    case 'SPLIT_ALREADY_PAID': return 'Cannot delete a paid split bill'
    default: return code
  }
}
