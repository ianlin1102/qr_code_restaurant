import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Table } from '@qr-order/shared'

const STORE_ID = 'store-demo-001'

function getDefaultBaseUrl(): string {
  const { protocol, hostname } = window.location
  // Always use the Vite default port 5173, not the current browser port
  // (admin might be on a different port)
  return `${protocol}//${hostname}:5173`
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState(getDefaultBaseUrl)

  useEffect(() => {
    fetch(`/api/stores/${STORE_ID}/tables`)
      .then(res => res.json())
      .then(data => setTables(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handlePrintAll = () => {
    window.print()
  }

  const handlePrintSingle = (tableName: string) => {
    // Hide all cards except the target, print, then restore
    const cards = document.querySelectorAll<HTMLElement>('[data-table-card]')
    cards.forEach(card => {
      if (card.dataset.tableCard !== tableName) {
        card.style.display = 'none'
      }
    })
    window.print()
    cards.forEach(card => {
      card.style.display = ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading tables...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header - hidden when printing */}
      <div className="mb-6 print:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Table QR Codes</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Back
            </Button>
            <Button onClick={handlePrintAll}>
              Print All
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground shrink-0">Base URL:</label>
          <Input
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="http://192.168.1.39:5173"
            className="font-mono text-sm"
          />
        </div>
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => {
          const scanUrl = `${baseUrl}/scan/${STORE_ID}/${table.id}`
          return (
            <Card
              key={table.id}
              data-table-card={table.name}
              className="print:break-inside-avoid print:border-2"
            >
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-xl">
                  Table {table.name}
                </CardTitle>
                <Badge
                  variant={table.status === 'idle' ? 'secondary' : 'default'}
                  className="print:hidden w-fit mx-auto"
                >
                  {table.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={scanUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all print:hidden">
                  {scanUrl}
                </p>
                <p className="hidden print:block text-sm font-medium text-center">
                  Scan to Order
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="print:hidden"
                  onClick={() => handlePrintSingle(table.name)}
                >
                  Print This
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
