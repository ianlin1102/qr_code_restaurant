// Dev tool: thermal printer test matrix (58mm + 80mm, bill + kitchen).

import { useState } from 'react'
import {
  buildReceiptHtml, buildKitchenTicketHtml, openPrintWindow, generateMockItems,
  type PrintCssVariant, type PaperWidth,
} from '@/lib/print-receipt'

const LENGTHS = [30, 60, 100, 150, 200, 300, 500] as const
const WIDTHS: PaperWidth[] = [58, 80]
const VARIANTS: { id: PrintCssVariant; label: string }[] = [
  { id: 'auto',  label: 'auto (CSS auto height)' },
  { id: '200mm', label: 'fixed 200mm' },
]
const TICKET_TYPES = ['bill', 'kitchen'] as const
type TicketType = typeof TICKET_TYPES[number]

export default function PrintTestPage() {
  const [width, setWidth] = useState<PaperWidth>(58)
  const [variant, setVariant] = useState<PrintCssVariant>('auto')
  const [ticket, setTicket] = useState<TicketType>('bill')

  const handlePrint = (targetMm: number) => {
    const items = generateMockItems(targetMm)
    const subtotal = items.reduce((s, i) => s + i.price, 0)
    const tax = Math.round(subtotal * 0.08)
    const label = `${width}mm ${ticket} ~${targetMm}mm`

    const html = ticket === 'bill'
      ? buildReceiptHtml({
          items,
          table: { name: 'T1' },
          summary: { tax, serviceFee: 0, totalWithTax: subtotal + tax, totalPaid: 0, remaining: subtotal + tax },
          orderCount: 1,
          lang: 'zh',
          paperWidth: width,
          variant,
          headerLabel: label,
        })
      : buildKitchenTicketHtml({
          items,
          table: { name: 'T1' },
          orderNumber: 'A0001',
          lang: 'zh',
          paperWidth: width,
          variant,
          headerLabel: label,
        })

    openPrintWindow(html)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Print Test Matrix</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
        Dev tool. Pick ticket type + paper width + CSS variant, click length → print preview.
      </p>

      <section style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Ticket Type</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {TICKET_TYPES.map(t => (
            <label key={t} style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="ticket"
                checked={ticket === t}
                onChange={() => setTicket(t)}
                style={{ marginRight: 6 }}
              />
              {t === 'bill' ? 'Bill (with prices)' : 'Kitchen (no prices)'}
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Paper Width</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {WIDTHS.map(w => (
            <label key={w} style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="width"
                checked={width === w}
                onChange={() => setWidth(w)}
                style={{ marginRight: 6 }}
              />
              {w}mm
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>CSS Variant</label>
        <select
          value={variant}
          onChange={e => setVariant(e.target.value as PrintCssVariant)}
          style={{ padding: '8px 12px', fontSize: 14, minWidth: 260 }}
        >
          {VARIANTS.map(v => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </section>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Content Length</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LENGTHS.map(mm => (
            <button
              key={mm}
              onClick={() => handlePrint(mm)}
              style={{
                padding: '10px 16px', fontSize: 14, cursor: 'pointer',
                border: '1px solid #888', borderRadius: 4, background: '#fff',
              }}
            >
              Print {mm}mm
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32, padding: 16, background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
        <h3 style={{ marginBottom: 8 }}>说明</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>
          <li><strong>Bill</strong>：前台账单（桌号 / 时间 / 订单数 / 菜品+价格 / 小计 / 税 / 合计）</li>
          <li><strong>Kitchen</strong>：后厨小票（桌号 / 单号 / 时间 / 菜品+数量+modifications，无价格）</li>
          <li>58mm 打印机 driver 设 58×200mm；80mm 打印机 driver 设 80×200mm</li>
          <li>生产 TablesPage 的"打印账单"按钮已用 58mm + auto + bill 格式</li>
        </ul>
      </section>
    </div>
  )
}
