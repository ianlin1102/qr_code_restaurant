import type { Order } from '@qr-order/shared'

const LINE_WIDTH = 32
const SEPARATOR = '='.repeat(LINE_WIDTH)
const DASH_LINE = '-'.repeat(LINE_WIDTH)

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatItemLine(name: string, qty: number, totalCents: number): string {
  const right = `x${qty}   ${formatPrice(totalCents)}`
  const maxName = LINE_WIDTH - right.length - 1
  const truncName = name.length > maxName ? name.slice(0, maxName) : name
  const gap = LINE_WIDTH - truncName.length - right.length
  return truncName + ' '.repeat(Math.max(gap, 1)) + right
}

function buildTicketLines(order: Order): string[] {
  const lines: string[] = [
    SEPARATOR,
    `ORDER #${order.orderNumber}`,
    `Table: ${order.tableName}`,
    `Time: ${formatTime(order.createdAt)}`,
    SEPARATOR,
  ]

  for (const item of order.items) {
    const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    const unitPrice = item.price + optAdjust
    const lineTotal = unitPrice * item.quantity
    lines.push(formatItemLine(item.name, item.quantity, lineTotal))

    for (const opt of item.selectedOptions ?? []) {
      lines.push(`  (${opt.optionName}: ${opt.choiceName})`)
    }
    if (item.remark) {
      lines.push(`  Note: ${item.remark}`)
    }
  }

  lines.push(DASH_LINE)

  const totalLabel = 'TOTAL:'
  const totalValue = formatPrice(order.totalPrice)
  const totalGap = LINE_WIDTH - totalLabel.length - totalValue.length
  lines.push(totalLabel + ' '.repeat(Math.max(totalGap, 1)) + totalValue)

  lines.push(SEPARATOR)
  return lines
}

export function formatTicket(order: Order): string {
  return buildTicketLines(order).join('\n')
}

export function formatReprintTicket(order: Order): string {
  return ['*** REPRINT ***', ...buildTicketLines(order)].join('\n')
}
