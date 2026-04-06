import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import type { Table } from '@qr-order/shared'

function renderQrSvg(url: string): string {
  const element = createElement(QRCodeSVG, {
    value: url,
    size: 200,
    level: 'M',
    includeMargin: false,
  })
  return renderToStaticMarkup(element)
}

function buildQrBlockHtml(table: Table, baseUrl: string, storeId: string): string {
  const scanUrl = `${baseUrl}/scan/${storeId}/${table.id}`
  const svg = renderQrSvg(scanUrl)
  const label = table.name ? `#${table.number} ${table.name}` : `Table ${table.number}`
  return `
    <div class="qr-block">
      <div class="qr-svg">${svg}</div>
      <p class="table-name">${label}</p>
      <p class="scan-url">${scanUrl}</p>
      <p class="scan-text">Scan to Order</p>
    </div>`
}

function buildPageHtml(tables: Table[], baseUrl: string, storeName: string): string {
  const storeId = tables[0]?.storeId ?? ''
  const date = new Date().toLocaleDateString()
  const blocks = tables.map(t => buildQrBlockHtml(t, baseUrl, storeId)).join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QR Codes - ${storeName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 12mm; }
  .header { text-align: center; margin-bottom: 8mm; }
  .header h1 { font-size: 20pt; }
  .header p { font-size: 10pt; color: #666; margin-top: 2mm; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .qr-block {
    border: 1px solid #ddd; border-radius: 4mm; padding: 6mm;
    display: flex; flex-direction: column; align-items: center;
    break-inside: avoid;
  }
  .qr-svg svg { width: 48mm; height: 48mm; }
  .table-name { font-size: 14pt; font-weight: bold; margin-top: 3mm; }
  .scan-url { font-size: 7pt; color: #999; margin-top: 1mm; word-break: break-all; text-align: center; max-width: 48mm; }
  .scan-text { font-size: 10pt; color: #555; margin-top: 1mm; }
  @media print {
    body { padding: 10mm; }
    .qr-block { page-break-inside: avoid; }
  }
</style></head><body>
  <div class="header">
    <h1>${storeName}</h1>
    <p>${date}</p>
  </div>
  <div class="grid">${blocks}</div>
  <script>window.onload=function(){window.print()}<\/script>
</body></html>`
}

export function printQrCodes(tables: Table[], baseUrl: string, storeName: string): void {
  if (tables.length === 0) return
  const html = buildPageHtml(tables, baseUrl, storeName)
  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to print QR codes.')
    return
  }
  win.document.write(html)
  win.document.close()
}
