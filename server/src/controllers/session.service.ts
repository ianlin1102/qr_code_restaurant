// Session service — re-export aggregator after Phase 4 file split.
// Submodules:
//   session-crud       — create/get/close/reopen + adoptOrphanedOrders
//   session-payment    — addPayment/recordCashPayment/confirm* + calcTax/calcServiceFee
//   session-cart       — shared cart (getSessionCart/updateDeviceCart/submitSessionCart)
//   session-coupon     — applyCoupon/removeCoupon
//   session-settlement — getSessionSummary/startSettlement/payByItems/payByPercent

export {
  createSession,
  getActiveSession,
  getSessionById,
  addOrderToSession,
  closeSession,
  reopenSession,
  adoptOrphanedOrders,
  recalcSessionTotal,
} from './session-crud.js'

export {
  calcTax,
  calcServiceFee,
  addPayment,
  getPayments,
  recordCashPayment,
  confirmItemPayment,
  confirmPercentPayment,
} from './session-payment.js'

export {
  getSessionCart,
  updateDeviceCart,
  clearSessionCart,
  submitSessionCart,
} from './session-cart.js'

export {
  applyCoupon,
  removeCoupon,
} from './session-coupon.js'

export {
  getSessionSummary,
  startSettlement,
  payByItems,
  payByPercent,
} from './session-settlement.js'

// Auto-close timer (kept here for backward compat with existing imports)
export { autoCloseStaleSessionsOnce, startAutoCloseTimer } from '../settlement/auto-close.js'
