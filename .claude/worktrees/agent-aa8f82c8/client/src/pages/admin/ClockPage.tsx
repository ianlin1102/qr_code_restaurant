import { useState, useCallback, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import PinPad from '@/components/clock/PinPad'
import ClockResultDialog from '@/components/clock/ClockResultDialog'
import type { TimeEntry } from '@qr-order/shared'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ClockPage() {
  const { t } = useT()
  const storeId = useAuthStore(s => s.user?.storeId)

  const [pin, setPin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [clockedIn, setClockedIn] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | undefined>()
  const [actionLoading, setActionLoading] = useState(false)

  const clock = t.clock

  const reset = useCallback(() => {
    setPin('')
    setDialogOpen(false)
    setError(null)
    setUsername('')
    setClockedIn(false)
    setCurrentEntry(undefined)
  }, [])

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length !== 4 || !storeId) return
    setVerifying(true)
    setError(null)

    api.verifyClockPin(storeId, pin)
      .then(result => {
        setUsername(result.user.username)
        setClockedIn(result.clockedIn)
        setCurrentEntry(result.currentEntry)
        setDialogOpen(true)
      })
      .catch(() => {
        setError(clock.invalidPin)
        setPin('')
      })
      .finally(() => setVerifying(false))
  }, [pin, storeId, clock.invalidPin])

  const handleClockIn = async () => {
    if (!storeId) return
    setActionLoading(true)
    try {
      await api.clockIn(storeId, pin)
      reset()
    } catch {
      setError(clock.alreadyClockedIn)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!storeId) return
    setActionLoading(true)
    try {
      const entry = await api.clockOut(storeId, pin)
      const dur = entry.duration ?? 0
      setError(null)
      reset()
      // Show brief success message
      setError(clock.successOut.replace('{duration}', formatDuration(dur)))
      setTimeout(() => setError(null), 3000)
    } catch {
      setError(clock.notClockedIn)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <h1 className="text-2xl font-bold font-display mb-8">{clock.title}</h1>

      <PinPad
        pin={pin}
        onDigit={d => { setError(null); setPin(p => p.length < 4 ? p + d : p) }}
        onBackspace={() => setPin(p => p.slice(0, -1))}
        disabled={verifying}
        enterPinLabel={clock.enterPin}
      />

      {error && (
        <p className="mt-6 text-sm text-destructive font-medium">{error}</p>
      )}

      <ClockResultDialog
        open={dialogOpen}
        onOpenChange={v => { if (!v) reset() }}
        username={username}
        clockedIn={clockedIn}
        currentEntry={currentEntry}
        loading={actionLoading}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        t={clock}
      />
    </div>
  )
}
