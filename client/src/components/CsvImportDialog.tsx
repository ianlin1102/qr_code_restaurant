import { useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import type { Category } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  onImported: () => void
  t: Record<string, any>
}

type ColumnMapping = {
  name: number | null
  nameEn: number | null
  price: number | null
  category: number | null
  description: number | null
}

function parseCsv(text: string): string[][] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  })
}

const AUTO_MAP_RULES: Array<{ key: keyof ColumnMapping; match: (h: string) => boolean }> = [
  { key: 'name', match: h => h.includes('\u540D') || h === 'name' },
  { key: 'nameEn', match: h => h.includes('english') || h === 'nameen' },
  { key: 'price', match: h => h.includes('\u4EF7') || h === 'price' },
  { key: 'category', match: h => h.includes('\u5206\u7C7B') || h === 'category' },
  { key: 'description', match: h => h.includes('\u63CF\u8FF0') || h === 'description' },
]

function autoMapHeaders(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { name: null, nameEn: null, price: null, category: null, description: null }
  headers.forEach((h, i) => {
    const hl = h.toLowerCase()
    for (const rule of AUTO_MAP_RULES) {
      if (mapping[rule.key] === null && rule.match(hl)) {
        mapping[rule.key] = i
        break
      }
    }
  })
  return mapping
}

export function CsvImportDialog({ open, onClose, categories, onImported, t }: Props) {
  const storeId = useAuthStore.getState().user?.storeId
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, nameEn: null, price: null, category: null, description: null })
  const [result, setResult] = useState<{ created: number; skipped: Array<{ row: number; reason: string }> } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(reader.result as string)
      if (parsed.length < 2) return
      setHeaders(parsed[0])
      setRows(parsed.slice(1))
      setMapping(autoMapHeaders(parsed[0]))
      setStep('map')
    }
    reader.readAsText(file)
  }

  const buildItems = useMemo(() => {
    const catMap = new Map(categories.map(c => [c.name, c.id]))
    const catMapEn = new Map(categories.filter(c => c.nameEn).map(c => [c.nameEn!, c.id]))

    return rows.map(row => {
      const name = mapping.name != null ? row[mapping.name] : ''
      const nameEn = mapping.nameEn != null ? row[mapping.nameEn] : undefined
      const priceStr = mapping.price != null ? row[mapping.price] : '0'
      const catName = mapping.category != null ? row[mapping.category] : ''
      const description = mapping.description != null ? row[mapping.description] : undefined
      const price = Math.round(parseFloat(priceStr || '0') * 100)
      const categoryId = catMap.get(catName) || catMapEn.get(catName) || ''
      return { name, nameEn, price, categoryId, description }
    })
  }, [rows, mapping, categories])

  const handleImport = async () => {
    if (!storeId) return
    setImporting(true)
    try {
      const items = buildItems
      const res = await api.batchImportMenuItems(storeId, items)
      setResult({ created: res.created.length, skipped: res.skipped })
      setStep('result')
      onImported()
    } catch (e) {
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  const fields: Array<{ key: keyof ColumnMapping; label: string }> = [
    { key: 'name', label: t.csv?.name || 'Name *' },
    { key: 'nameEn', label: t.csv?.nameEn || 'English Name' },
    { key: 'price', label: t.csv?.price || 'Price (\u00A5)' },
    { key: 'category', label: t.csv?.category || 'Category' },
    { key: 'description', label: t.csv?.description || 'Description' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{t.csv?.importTitle || 'Import CSV'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <span aria-hidden>&#x2715;</span>
          </button>
        </div>

        {step === 'upload' && <UploadStep fileRef={fileRef} onFile={handleFile} t={t} />}
        {step === 'map' && (
          <MapStep fields={fields} headers={headers} mapping={mapping}
            setMapping={setMapping} onBack={() => setStep('upload')}
            onNext={() => setStep('preview')} t={t} />
        )}
        {step === 'preview' && (
          <PreviewStep rows={rows} buildItems={buildItems}
            importing={importing} onBack={() => setStep('map')}
            onImport={handleImport} t={t} />
        )}
        {step === 'result' && result && <ResultStep result={result} onClose={onClose} t={t} />}
      </div>
    </div>
  )
}

/* ---- Sub-steps (keep main component under 50 lines of JSX) ---- */

function UploadStep({ fileRef, onFile, t }: {
  fileRef: React.RefObject<HTMLInputElement | null>; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void; t: Record<string, any>
}) {
  return (
    <div className="text-center py-8">
      <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
      <Button onClick={() => fileRef.current?.click()}>{t.csv?.selectFile || 'Select CSV File'}</Button>
      <p className="text-xs text-muted-foreground mt-2">{t.csv?.csvHint || 'First row should be column headers'}</p>
    </div>
  )
}

function MapStep({ fields, headers, mapping, setMapping, onBack, onNext, t }: {
  fields: Array<{ key: keyof ColumnMapping; label: string }>; headers: string[]
  mapping: ColumnMapping; setMapping: (m: ColumnMapping) => void
  onBack: () => void; onNext: () => void; t: Record<string, any>
}) {
  return (
    <div>
      <p className="text-sm mb-3">{t.csv?.mapColumns || 'Map CSV columns to menu fields:'}</p>
      <div className="space-y-2">
        {fields.map(f => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="w-32 text-sm">{f.label}</span>
            <select
              value={mapping[f.key] ?? ''}
              onChange={e => setMapping({ ...mapping, [f.key]: e.target.value === '' ? null : parseInt(e.target.value) })}
              className="flex-1 border rounded px-2 py-1 text-sm"
            >
              <option value="">-- Skip --</option>
              {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onBack}>{t.common?.cancel || 'Back'}</Button>
        <Button onClick={onNext} disabled={mapping.name === null}>
          {t.csv?.preview || 'Preview'}
        </Button>
      </div>
    </div>
  )
}

function PreviewStep({ rows, buildItems, importing, onBack, onImport, t }: {
  rows: string[][]; buildItems: () => Array<{ name: string; price: number; categoryId: string }>
  importing: boolean; onBack: () => void; onImport: () => void; t: Record<string, any>
}) {
  const previewItems = buildItems().slice(0, 20)
  return (
    <div>
      <p className="text-sm mb-2">{rows.length} {t.csv?.rowsFound || 'rows found'}</p>
      <div className="border rounded max-h-60 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="p-1 text-left">#</th>
              <th className="p-1 text-left">{t.csv?.name || 'Name'}</th>
              <th className="p-1 text-left">{t.csv?.price || 'Price'}</th>
              <th className="p-1 text-left">{t.csv?.category || 'Category'}</th>
            </tr>
          </thead>
          <tbody>
            {previewItems.map((item, i) => (
              <tr key={i} className={!item.categoryId ? 'bg-yellow-50' : ''}>
                <td className="p-1">{i + 1}</td>
                <td className="p-1">{item.name}</td>
                <td className="p-1">{'\u00A5'}{(item.price / 100).toFixed(2)}</td>
                <td className="p-1">{item.categoryId ? '\u2713' : '\u26A0 Unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 20 && (
        <p className="text-xs text-muted-foreground mt-1">... and {rows.length - 20} more</p>
      )}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onBack}>{t.common?.cancel || 'Back'}</Button>
        <Button onClick={onImport} disabled={importing}>
          {importing ? (t.csv?.importing || 'Importing...') : (t.csv?.confirmImport || `Import ${rows.length} items`)}
        </Button>
      </div>
    </div>
  )
}

function ResultStep({ result, onClose, t }: {
  result: { created: number; skipped: Array<{ row: number; reason: string }> }
  onClose: () => void; t: Record<string, any>
}) {
  return (
    <div>
      <p className="text-sm mb-2">{'\u2713'} {result.created} {t.csv?.created || 'items created'}</p>
      {result.skipped.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {result.skipped.length} {t.csv?.skipped || 'rows skipped'}:
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
            {result.skipped.map((s, i) => (
              <li key={i}>Row {s.row}: {s.reason}</li>
            ))}
          </ul>
        </div>
      )}
      <Button className="mt-4" onClick={onClose}>{t.common?.close || 'Close'}</Button>
    </div>
  )
}
