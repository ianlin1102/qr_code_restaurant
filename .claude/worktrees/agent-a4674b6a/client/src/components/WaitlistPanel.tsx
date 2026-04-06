import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useT } from '@/i18n/useT'
import type { WaitlistEntry } from '@qr-order/shared'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Props {
  storeId: string
}

function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

export default function WaitlistPanel({ storeId }: Props) {
  const { t } = useT()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWaitlist = useCallback(async () => {
    try {
      const data = await api.getWaitlist(storeId)
      setEntries(data.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    } catch {
      // silently retry on next interval
    }
  }, [storeId])

  useEffect(() => {
    fetchWaitlist()
    const interval = setInterval(fetchWaitlist, 30_000)
    return () => clearInterval(interval)
  }, [fetchWaitlist])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const size = parseInt(partySize, 10)
    if (!name.trim() || !size || size < 1) return

    setLoading(true)
    setError(null)
    try {
      await api.addToWaitlist(storeId, {
        name: name.trim(),
        partySize: size,
        phone: phone.trim() || undefined,
      })
      setName('')
      setPartySize('')
      setPhone('')
      await fetchWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setLoading(false)
    }
  }

  async function handleSeat(entryId: string) {
    try {
      await api.seatWaitlistEntry(storeId, entryId)
      await fetchWaitlist()
    } catch {
      // ignore
    }
  }

  async function handleRemove(entryId: string) {
    try {
      await api.removeFromWaitlist(storeId, entryId)
      await fetchWaitlist()
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-3 space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <Input
          placeholder={t.common.name}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={t.waitlist.partySize}
            min={1}
            value={partySize}
            onChange={e => setPartySize(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            placeholder={t.waitlist.phone}
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="flex-1"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
          {loading ? t.waitlist.adding : t.waitlist.addEntry}
        </Button>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t.waitlist.noWaiting}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <WaitlistItem
              key={entry.id}
              entry={entry}
              position={index + 1}
              onSeat={handleSeat}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface ItemProps {
  entry: WaitlistEntry
  position: number
  onSeat: (id: string) => void
  onRemove: (id: string) => void
}

function WaitlistItem({ entry, position, onSeat, onRemove }: ItemProps) {
  const { t } = useT()
  const waited = minutesSince(entry.createdAt)

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant="outline">#{position}</Badge>
        <div className="min-w-0">
          <p className="font-medium truncate">{entry.name}</p>
          <p className="text-xs text-muted-foreground">
            {t.waitlist.partyOf.replace('{{count}}', String(entry.partySize))}
            {entry.phone && <span> &middot; {entry.phone}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary">{t.waitlist.minutesWaited.replace('{{count}}', String(waited))}</Badge>
        {entry.estimatedWait != null && (
          <Badge variant="outline">{t.waitlist.estWait.replace('{{count}}', String(entry.estimatedWait))}</Badge>
        )}
        <Button size="sm" onClick={() => onSeat(entry.id)}>
          {t.waitlist.seat}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onRemove(entry.id)}>
          {t.waitlist.remove}
        </Button>
      </div>
    </li>
  )
}
