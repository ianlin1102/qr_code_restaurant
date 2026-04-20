# Phase 5 — Client OrderStatus draft case handoff to Phase G Task 34

Phase B Task 7 expanded `OrderStatus` to include `'draft'`. The following client
sites have switch statements / conditional branches on OrderStatus and must be
updated in Phase G Task 34 (session-cart B2 rewrite) to handle `'draft'` explicitly.

**Action for Task 34**: each entry below → decide whether draft should be shown,
hidden, or filtered. Cart-facing UI should show drafts; kitchen/KDS/admin views
should hide drafts (use `isActiveOrder` or `isSubmitted` helper).

## Sites found

client/src/components/order/OrderDetailDialog.tsx:172:          {order.status !== 'served' && onEdit && (
client/src/components/order/OrderDetailDialog.tsx:177:          {order.status === 'pending' && onStatusUpdate && (
client/src/components/order/OrderDetailDialog.tsx:187:          {order.status === 'confirmed' && onStatusUpdate && (
client/src/components/order/OrderDetailDialog.tsx:197:          {order.status === 'preparing' && onStatusUpdate && (
client/src/components/order/OrderCard.tsx:119:            {order.status !== 'served' && (
client/src/components/table/SplitBillCards.tsx:75:          {split.status === 'paid' && <Badge className="text-xs">{ts.paid}</Badge>}
client/src/components/table/SplitBillCards.tsx:76:          {split.status === 'pending-capture' && (
client/src/components/table/SplitBillCards.tsx:83:      {split.status === 'paid' && (
client/src/components/table/SplitBillCards.tsx:88:      {split.status === 'unpaid' && (
client/src/components/table/SplitBillCards.tsx:95:      {split.status === 'pending-capture' && (
client/src/components/table/TransferTableDialog.tsx:36:          tbl => tbl.status === 'idle' && tbl.id !== order.tableId,
client/src/components/table/TableDetailPanel.tsx:107:    .filter((o) => o.status === 'served')
client/src/components/table/TableDetailPanel.tsx:130:              {selected.status === 'occupied' ? t.tableDetail.occupied : t.tableDetail.idle}
client/src/components/table/TableDetailPanel.tsx:136:            || selected.status === 'occupied'
client/src/components/table/TableDetailPanel.tsx:137:            || selected.status === 'bill-requested'
client/src/components/table/TableDetailPanel.tsx:138:            || selected.status === 'cleaning') && (
client/src/components/table/TableDetailPanel.tsx:146:              {(selected.status === 'occupied' || selected.status === 'bill-requested') && (
client/src/components/table/TableDetailPanel.tsx:153:              {selected.status === 'cleaning' && (
client/src/components/table/CreateSplitSheet.tsx:52:      if (sb.type === 'by-item' && sb.status === 'unpaid' && sb.itemKeys) {
client/src/components/table/CloseTableDialog.tsx:37:          o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing',
client/src/components/table/SplitBillManager.tsx:95:  const unpaidSplitTotal = splits.filter(s => s.status === 'unpaid').reduce((sum, s) => sum + s.total, 0)
client/src/components/table/BillSettleComponents.tsx:67:  if (session.status === 'closed') return null
client/src/components/table/TableGrid.tsx:25:    o => o.tableId === table.id && (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'),
client/src/components/table/TableGrid.tsx:58:        const showOccupied = table.status === 'occupied' || !!activeOrder
client/src/components/table/TableGrid.tsx:66:              table.status === 'cleaning' && 'animate-pulse',
client/src/components/table/TableGrid.tsx:103:              {table.status === 'idle' && !activeOrder && (
client/src/components/floor/ActiveOrdersSidebar.tsx:111:      .filter(o => o.status === group.status)
client/src/components/customer/SettlementSheet.tsx:55:      .then(({ splits }) => setHasWaiterSplits(splits.some(s => s.status === 'unpaid')))
client/src/components/customer/SettlementSheet.tsx:159:        {session.status === 'closed' && (
client/src/lib/settlement.ts:10:  const isClosed = session.status === 'closed'
client/src/lib/settlement.ts:13:  const hasUnpaidSplits = splits?.some(s => s.status === 'unpaid') ?? false
client/src/pages/admin/TablesPage.tsx:351:                    tb.status === 'cleaning' && 'animate-pulse',
client/src/pages/admin/TablesPage.tsx:379:                  {selected.status === 'occupied' && sessionSummary && (() => {
client/src/pages/admin/TablesPage.tsx:410:              {(selected.status === 'occupied' || selected.status === 'bill-requested') && (
client/src/pages/admin/TablesPage.tsx:422:              {selected.status === 'cleaning' && (
client/src/pages/admin/FloorPlanPage.tsx:47:  const occupiedCount = useMemo(() => enabledTables.filter(tb => tb.status === 'occupied').length, [enabledTables])
client/src/pages/admin/DashboardPage.tsx:113:    if (order.status === 'pending') {
client/src/pages/admin/DashboardPage.tsx:125:    if (order.status === 'confirmed') {
client/src/pages/admin/DashboardPage.tsx:137:    if (order.status === 'preparing') {
client/src/pages/customer/MenuPage.tsx:147:    if (sessionSummary?.status === 'closed') {
client/src/services/api/_client.ts:51:  if (res.status === 401) {
client/src/services/api/_client.ts:66:  if (res.status === 204) return undefined as T

## Server-side switches (also for Task 34)

server/src/settlement/allowed-actions.ts:6:  const hasUnpaidSplits = splits.some(s => s.status === 'unpaid')
server/src/settlement/allowed-actions.ts:7:  const isClosed = session.status === 'closed'
server/src/settlement/rules.ts:11:  if (ctx.session.status === 'closed') return 'SESSION_CLOSED'
server/src/settlement/gateway.ts:93:  const sessionStatus = freshCtx?.session.status === 'closed' ? 'closed' as const
server/src/scripts/test-payment-flow.ts:78:  const table = tables.find(t => t.status === 'idle')
server/src/scripts/test-payment-flow.ts:175:  assert(finalSummary.status === 'active', `Session status: ${finalSummary.status} (expected active — auto-close disabled)`)
server/src/scripts/test-payment-flow.ts:187:  assert(closedSummary.status === 'closed', `After close → status: ${closedSummary.status}`)
server/src/scripts/test-payment-flow.ts:192:  assert(ourTable?.status === 'idle', `Table status: ${ourTable?.status} (expected idle)`)
server/src/controllers/session-cart.ts:19:  if (!session || session.status === 'closed') return
server/src/controllers/session-cart.ts:46:  if (session.status === 'closed') return { error: 'Session is closed', status: 400 }
server/src/controllers/waitlist.service.ts:13:    .filter(e => e.status === 'waiting')
server/src/controllers/split-bill.service.ts:73:    const unpaidSplitTotal = existingSplits.filter((s: SplitBill) => s.status === 'unpaid').reduce((sum: number, s: SplitBill) => sum + s.total, 0)
server/src/controllers/session-settlement.ts:78:  if (session.status === 'closed') return { error: 'Session is closed' }
server/src/controllers/payment.service.ts:110:  if (session.status === 'closed') {
server/src/controllers/order.service.ts:138:    orders = orders.filter(o => o.status === status)
server/src/controllers/order.service.ts:168:  if (order.status === 'served') {
server/src/controllers/order.service.ts:271:  if (order.status === 'served') {
server/src/controllers/order.service.ts:313:    const active = sessions.find(s => s.orderIds.includes(orderId) && s.status === 'active')
server/src/controllers/session-coupon.ts:14:  if (session.status === 'closed') return { error: 'Session is closed' }
server/src/controllers/table.service.ts:125:  if (table.status === 'occupied') {
server/src/controllers/table.service.ts:161:  if (table.status === 'occupied') return { error: 'Cannot regenerate QR for an occupied table' }
server/src/controllers/table.service.ts:224:    .filter(o => o.tableId === tableId && (o.status === 'pending' || o.status === 'preparing'))
server/src/controllers/session-crud.ts:20:    .find(s => s.tableId === tableId && s.status === 'active')
server/src/controllers/session-crud.ts:32:  if (session.status === 'closed') return { error: 'Session is closed' }
server/src/controllers/session-crud.ts:48:  if (session.status === 'closed') return { error: 'Already closed' }
server/src/controllers/session-crud.ts:66:  if (session.status === 'active') return { error: 'Already active' }
