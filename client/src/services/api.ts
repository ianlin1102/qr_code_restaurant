// API aggregator — re-exports everything from domain modules.
// The `api` object preserves the original flat shape for existing callers.

export type { SessionSummary, AllowedActions, SettlementResult } from './api/_client'

import { menuApi } from './api/menu'
import { orderApi } from './api/order'
import { tableApi } from './api/table'
import { sessionApi } from './api/session'
import { staffApi } from './api/staff'
import { adminApi } from './api/admin'

export const api = {
  ...adminApi,
  ...menuApi,
  ...orderApi,
  ...tableApi,
  ...sessionApi,
  ...staffApi,
}
