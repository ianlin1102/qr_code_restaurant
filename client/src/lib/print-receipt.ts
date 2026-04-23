// Shared print templates for thermal printers (58mm / 80mm).
// - buildReceiptHtml : customer-facing bill (dishes + prices + totals)
// - buildKitchenTicketHtml : kitchen-facing ticket (dishes + modifications, NO prices)

import { formatPriceUSD } from './format'

export interface ReceiptItem {
  name: string
  qty: number
  price: number // cents (line total)
  opts: string  // '' if no options
  remark?: string
}

export interface ReceiptTable { name: string }

export interface ReceiptSummary {
  tax: number
  serviceFee: number
  totalWithTax: number
  totalPaid: number
  remaining: number
}

export type PaperWidth = 58 | 80
export type PrintCssVariant = 'auto' | '200mm'

interface WidthSpec {
  page: number
  innerPadMm: number // side padding inside .r
  fontSize: number
  titleSize: number
}

const WIDTH_SPECS: Record<PaperWidth, WidthSpec> = {
  58: { page: 58, innerPadMm: 3, fontSize: 11, titleSize: 13 },
  80: { page: 80, innerPadMm: 5, fontSize: 12, titleSize: 15 },
}

function pageRule(variant: PrintCssVariant, width: number): string {
  return variant === '200mm'
    ? `@page{size:${width}mm 200mm;margin:0}`
    : `@page{size:${width}mm auto;margin:0}`
}

// Shared CSS base for both bill and kitchen ticket
function baseCss(spec: WidthSpec, variant: PrintCssVariant, lineHeight = 1.3): string {
  return `
  ${pageRule(variant, spec.page)}
  html,body{margin:0;padding:0;width:${spec.page}mm}
  body{font-family:'Courier New','Microsoft YaHei',monospace;font-size:${spec.fontSize}px;line-height:${lineHeight};color:#000}
  .r{width:${spec.page}mm;padding:3mm ${spec.innerPadMm}mm;margin:0;box-sizing:border-box}
  .c{text-align:center} .b{font-weight:bold}
  .d{border-top:1px dashed #000;margin:3px 0}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  td{padding:1px 0;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word}
  @media print{html,body{margin:0;width:${spec.page}mm}}
`
}

// ============================================================
// BILL (customer-facing, with prices/totals)
// ============================================================
export function buildReceiptHtml(opts: {
  items: ReceiptItem[]
  table: ReceiptTable
  summary: ReceiptSummary
  orderCount: number
  lang: string
  paperWidth?: PaperWidth
  variant?: PrintCssVariant
  headerLabel?: string
}): string {
  const width = opts.paperWidth ?? 58
  const variant = opts.variant ?? 'auto'
  const spec = WIDTH_SPECS[width]
  const zh = opts.lang === 'zh'
  const now = formatTimeShort()
  const { items, table, summary, orderCount } = opts
  const subtotal = items.reduce((s, i) => s + i.price, 0)
  const title = opts.headerLabel ?? (zh ? '账单' : 'Bill')

  const rows = items.map(i => `
    <tr>
      <td class="lbl">${esc(i.name)} x${i.qty}</td>
      <td class="amt">${formatPriceUSD(i.price)}</td>
    </tr>
    ${i.opts ? `<tr><td colspan="2" class="full">${esc(i.opts)}</td></tr>` : ''}
    ${i.remark ? `<tr><td colspan="2" class="full">*${esc(i.remark)}</td></tr>` : ''}
  `).join('')

  return `<html><head><title>${esc(title)}</title>
<style>${baseCss(spec, variant, 1.3)}
  td.lbl{text-align:left;width:40%}
  td.amt{text-align:right;width:60%;white-space:nowrap;font-variant-numeric:tabular-nums}
  td.full{padding-left:3mm;font-size:${spec.fontSize - 1}px;color:#333}
  .total td.lbl,.total td.amt{font-size:${spec.fontSize + 1}px;font-weight:bold;padding-top:3px}
</style></head><body>
<div class="r">
  <div class="c b" style="font-size:${spec.titleSize}px;margin-bottom:2px">${esc(title)}</div>
  <div class="d"></div>
  <table>
    <tr><td class="lbl">${zh ? '桌号' : 'Table'}</td><td class="amt b">${esc(table.name)}</td></tr>
    <tr><td class="lbl">${zh ? '时间' : 'Time'}</td><td class="amt">${now}</td></tr>
    <tr><td class="lbl">${zh ? '订单数' : 'Orders'}</td><td class="amt">${orderCount}</td></tr>
  </table>
  <div class="d"></div>
  <table>${rows}</table>
  <div class="d"></div>
  <table>
    <tr><td class="lbl">${zh ? '小计' : 'Subtotal'}</td><td class="amt">${formatPriceUSD(subtotal)}</td></tr>
    ${summary.tax > 0 ? `<tr><td class="lbl">${zh ? '税' : 'Tax'}</td><td class="amt">${formatPriceUSD(summary.tax)}</td></tr>` : ''}
    ${summary.serviceFee > 0 ? `<tr><td class="lbl">${zh ? '服务费' : 'Service Fee'}</td><td class="amt">${formatPriceUSD(summary.serviceFee)}</td></tr>` : ''}
    <tr class="total"><td class="lbl">${zh ? '合计' : 'Total'}</td><td class="amt">${formatPriceUSD(summary.totalWithTax)}</td></tr>
    ${summary.totalPaid > 0 ? `<tr><td class="lbl" style="color:green">${zh ? '已付' : 'Paid'}</td><td class="amt" style="color:green">-${formatPriceUSD(summary.totalPaid)}</td></tr>` : ''}
    ${summary.remaining > 0 && summary.totalPaid > 0 ? `<tr class="total"><td class="lbl" style="color:orange">${zh ? '待付' : 'Remaining'}</td><td class="amt" style="color:orange">${formatPriceUSD(summary.remaining)}</td></tr>` : ''}
  </table>
  <div class="d"></div>
  <div class="c" style="font-size:${spec.fontSize}px;color:#666;margin-top:6px">${zh ? '谢谢光临' : 'Thank you!'}</div>
</div>
</body></html>`
}

// ============================================================
// KITCHEN TICKET (kitchen-facing, dishes + modifications only)
// ============================================================
export function buildKitchenTicketHtml(opts: {
  items: ReceiptItem[]
  table: ReceiptTable
  orderNumber: string
  lang: string
  paperWidth?: PaperWidth
  variant?: PrintCssVariant
  headerLabel?: string
}): string {
  const width = opts.paperWidth ?? 58
  const variant = opts.variant ?? 'auto'
  const spec = WIDTH_SPECS[width]
  const zh = opts.lang === 'zh'
  const now = formatTimeShort()
  const { items, table, orderNumber } = opts
  const title = opts.headerLabel ?? (zh ? '厨房' : 'KITCHEN')

  const rows = items.map(i => `
    <tr class="dish-row">
      <td class="dish-name">${esc(i.name)}</td>
      <td class="dish-qty">x${i.qty}</td>
    </tr>
    ${i.opts ? `<tr><td colspan="2" class="mod">${esc(i.opts)}</td></tr>` : ''}
    ${i.remark ? `<tr><td colspan="2" class="note">* ${esc(i.remark)}</td></tr>` : ''}
  `).join('')

  const dishSize = spec.fontSize + 3 // larger for kitchen visibility
  const qtySize = spec.fontSize + 5

  return `<html><head><title>${esc(title)}</title>
<style>${baseCss(spec, variant, 1.25)}
  td.dish-name{text-align:left;font-size:${dishSize}px;font-weight:bold;padding-top:3mm}
  td.dish-qty{text-align:right;font-size:${qtySize}px;font-weight:bold;white-space:nowrap;padding-top:3mm}
  td.mod{padding-left:5mm;font-size:${spec.fontSize + 1}px;color:#000}
  td.note{padding-left:5mm;font-size:${spec.fontSize + 1}px;font-weight:bold}
  .meta{font-size:${spec.fontSize + 1}px}
  .meta .b{font-weight:bold}
</style></head><body>
<div class="r">
  <div class="c b" style="font-size:${spec.titleSize + 2}px;margin-bottom:3px">${esc(title)}</div>
  <div class="d"></div>
  <table class="meta">
    <tr><td>${zh ? '桌号' : 'Table'}</td><td class="c b" style="font-size:${spec.titleSize + 2}px">${esc(table.name)}</td></tr>
    <tr><td>${zh ? '单号' : 'Order'}</td><td style="text-align:right">#${esc(orderNumber)}</td></tr>
    <tr><td>${zh ? '时间' : 'Time'}</td><td style="text-align:right">${now}</td></tr>
  </table>
  <div class="d"></div>
  <table>${rows}</table>
  <div class="d"></div>
</div>
</body></html>`
}

// ============================================================
// Helpers
// ============================================================
function formatTimeShort(): string {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** Open a print window and trigger print. Driver paper preset decides final size. */
export function openPrintWindow(html: string): void {
  const w = window.open('', '_blank', 'width=320,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
  const doPrint = () => { w.focus(); w.print() }
  if (w.document.readyState === 'complete') doPrint()
  else w.addEventListener('load', doPrint)
}

/** Mock items targeting approximately `targetMm` rendered height. */
export function generateMockItems(targetMm: number): ReceiptItem[] {
  const overhead = 35
  const perItem = 8
  const count = Math.max(1, Math.round((targetMm - overhead) / perItem))
  return Array.from({ length: count }, (_, i) => ({
    name: `测试菜品 ${i + 1}`,
    qty: (i % 3) + 1,
    price: 1000,
    opts: i % 2 === 0 ? '辣度: 中辣' : '',
    remark: i % 4 === 0 ? '少盐' : undefined,
  }))
}
