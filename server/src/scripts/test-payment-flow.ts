/**
 * End-to-end payment flow test — runs against a live server.
 *
 * Tests:
 *   1. Create session + place order
 *   2. Verify session summary shows correct remaining (with tax)
 *   3. Pay by items → verify no side effects until payment confirmed
 *   4. Simulate cash payment (admin) → verify session auto-closes
 *   5. Verify table returns to idle
 *
 * Usage: tsx server/src/scripts/test-payment-flow.ts
 */

const BASE = process.env.API_URL || 'http://localhost:3001/api'
const STORE_ID = process.env.STORE_ID || 'store-demo-001'

let passCount = 0
let failCount = 0

function assert(condition: boolean, msg: string) {
  if (condition) { passCount++; console.log(`  ✅ ${msg}`) }
  else { failCount++; console.error(`  ❌ FAIL: ${msg}`) }
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...(opts?.headers as Record<string, string>) }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${path}: ${body}`)
  }
  return res.json() as Promise<T>
}

async function apiWithAuth<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  if (!authToken) {
    // Try common credentials
    const creds = [
      { username: 'admin', password: 'admin123' },
      { username: 'ian', password: 'ian123' },
      { username: 'ian', password: 'password' },
    ]
    for (const cred of creds) {
      try {
        const login = await api<{ token: string }>(`/stores/${STORE_ID}/auth/login`, {
          method: 'POST', body: JSON.stringify(cred),
        })
        authToken = login.token
        console.log(`  Logged in as: ${cred.username}`)
        break
      } catch { /* try next */ }
    }
    if (!authToken) throw new Error('Could not login — update credentials in test script')
  }
  return api<T>(path, {
    ...opts,
    headers: { ...(opts?.headers as Record<string, string>), Authorization: `Bearer ${authToken}` },
  })
}

let authToken: string | null = null

interface SessionSummary {
  id: string; status: string; totalAmount: number; totalPaid: number
  remaining: number; isPaid: boolean; netDue: number; tax: number
  serviceFee: number; totalWithTax: number; orderIds: string[]
  settlementMode?: string; paidItemIds?: string[]
  orders: { id: string; items: { menuItemId: string; price: number; quantity: number }[] }[]
}

interface Table { id: string; status: string; currentSessionId?: string }

async function run() {
  console.log(`\n🧪 Payment Flow Test — ${BASE}/stores/${STORE_ID}\n`)

  // ── Setup: find a table and a menu item ──
  const tables = await apiWithAuth<Table[]>(`/stores/${STORE_ID}/tables`)
  const table = tables.find(t => t.status === 'idle')
  if (!table) { console.error('No idle table found. Clean up and retry.'); process.exit(1) }
  console.log(`Using table: ${table.id.slice(0, 12)}...`)

  const menu = await api<{ categories: { items: { id: string; name: string; price: number }[] }[] }>(
    `/stores/${STORE_ID}/menu`,
  )
  const item1 = menu.categories.flatMap(c => c.items)[0]
  const item2 = menu.categories.flatMap(c => c.items)[1]
  if (!item1 || !item2) { console.error('Need at least 2 menu items'); process.exit(1) }
  console.log(`Items: "${item1.name}" ($${(item1.price / 100).toFixed(2)}), "${item2.name}" ($${(item2.price / 100).toFixed(2)})`)

  // ── Test 1: Create order (creates/links session) ──
  console.log('\n── Test 1: Create orders ──')
  const order1 = await api<{ id: string; sessionId: string; totalPrice: number }>(
    `/stores/${STORE_ID}/orders`,
    { method: 'POST', body: JSON.stringify({ tableId: table.id, items: [{ menuItemId: item1.id, quantity: 2 }] }) },
  )
  assert(!!order1.sessionId, `Order 1 created with sessionId: ${order1.sessionId.slice(0, 8)}...`)

  const order2 = await api<{ id: string; sessionId: string; totalPrice: number }>(
    `/stores/${STORE_ID}/orders`,
    { method: 'POST', body: JSON.stringify({ tableId: table.id, items: [{ menuItemId: item2.id, quantity: 1 }] }) },
  )
  assert(order2.sessionId === order1.sessionId, 'Order 2 linked to same session')

  const expectedSubtotal = item1.price * 2 + item2.price
  console.log(`  Subtotal: $${(expectedSubtotal / 100).toFixed(2)}`)

  // ── Test 2: Session summary with tax ──
  console.log('\n── Test 2: Session summary ──')
  const summary = await api<SessionSummary>(
    `/stores/${STORE_ID}/sessions?tableId=${table.id}`,
  )
  assert(summary.totalAmount === expectedSubtotal, `totalAmount = ${summary.totalAmount} (expected ${expectedSubtotal})`)
  assert(summary.totalPaid === 0, `totalPaid = 0`)
  assert(summary.remaining > 0, `remaining = ${summary.remaining} > 0`)
  assert(summary.remaining === summary.totalWithTax, `remaining (${summary.remaining}) === totalWithTax (${summary.totalWithTax})`)
  console.log(`  Tax: $${(summary.tax / 100).toFixed(2)}, Service: $${(summary.serviceFee / 100).toFixed(2)}, Total: $${(summary.totalWithTax / 100).toFixed(2)}`)

  // ── Test 3: Pay by items (pure calculation, no side effects) ──
  console.log('\n── Test 3: Pay by items (calculate only) ──')
  const itemKey = `${order1.id}:0`
  const calcResult = await api<{ amount: number; tax: number; serviceFee: number }>(
    `/stores/${STORE_ID}/sessions/${summary.id}/pay-items`,
    { method: 'POST', body: JSON.stringify({ itemKeys: [itemKey] }) },
  )
  assert(calcResult.amount > 0, `Calculated amount: $${(calcResult.amount / 100).toFixed(2)}`)

  // Verify NO side effects — paidItemIds should still be empty
  const afterCalc = await api<SessionSummary>(
    `/stores/${STORE_ID}/sessions?tableId=${table.id}`,
  )
  assert((afterCalc.paidItemIds ?? []).length === 0, `paidItemIds still empty (no ghost payment)`)
  assert(!afterCalc.settlementMode, `settlementMode still null (not locked)`)

  // ── Test 4: Pay by percent (calculate only) ──
  console.log('\n── Test 4: Pay by percent (calculate only) ──')
  const percentCalc = await api<{ amount: number; tax: number; serviceFee: number }>(
    `/stores/${STORE_ID}/sessions/${summary.id}/pay-percent`,
    { method: 'POST', body: JSON.stringify({ percent: 50 }) },
  )
  assert(percentCalc.amount > 0, `50% amount: $${(percentCalc.amount / 100).toFixed(2)}`)

  // Still no side effects
  const afterPercent = await api<SessionSummary>(
    `/stores/${STORE_ID}/sessions?tableId=${table.id}`,
  )
  assert(!afterPercent.settlementMode, `settlementMode still null after percent calc`)

  // ── Test 5: Mark orders served (prerequisite for auto-close) ──
  console.log('\n── Test 5: Mark orders as served ──')
  await apiWithAuth(`/stores/${STORE_ID}/orders/${order1.id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'served' }),
  })
  await apiWithAuth(`/stores/${STORE_ID}/orders/${order2.id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: 'served' }),
  })
  console.log('  Both orders marked as served')

  // ── Test 6: Cash payment (full amount) → should auto-close ──
  console.log('\n── Test 6: Cash payment (admin) → auto-close ──')
  const fullAmount = afterPercent.remaining
  const cashResult = await apiWithAuth<{ session: { status: string }; change: number }>(
    `/stores/${STORE_ID}/sessions/${summary.id}/cash-payment`,
    { method: 'POST', body: JSON.stringify({ amount: fullAmount, receivedAmount: fullAmount + 500 }) },
  )
  assert(cashResult.change === 500, `Change: $${(cashResult.change / 100).toFixed(2)} (expected $5.00)`)

  // Check session is closed
  const finalSummary = await api<SessionSummary>(
    `/stores/${STORE_ID}/sessions/${summary.id}/summary`,
  )
  assert(finalSummary.status === 'closed', `Session status: ${finalSummary.status} (expected closed)`)
  assert(finalSummary.isPaid, `isPaid: ${finalSummary.isPaid}`)
  assert(finalSummary.remaining === 0, `remaining: ${finalSummary.remaining} (expected 0)`)

  // Check table is idle
  const finalTable = await apiWithAuth<Table[]>(`/stores/${STORE_ID}/tables`)
  const ourTable = finalTable.find(t => t.id === table.id)
  assert(ourTable?.status === 'idle', `Table status: ${ourTable?.status} (expected idle)`)
  assert(!ourTable?.currentSessionId, `Table currentSessionId cleared`)

  // ── Summary ──
  console.log(`\n${'═'.repeat(40)}`)
  console.log(`✅ Passed: ${passCount}`)
  if (failCount > 0) console.log(`❌ Failed: ${failCount}`)
  else console.log('🎉 All tests passed!')
  console.log(`${'═'.repeat(40)}\n`)
  process.exit(failCount > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
