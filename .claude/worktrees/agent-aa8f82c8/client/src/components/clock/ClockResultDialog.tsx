import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TimeEntry } from '@qr-order/shared'

interface ClockResultDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  username: string
  clockedIn: boolean
  currentEntry?: TimeEntry
  loading: boolean
  onClockIn: () => void
  onClockOut: () => void
  t: {
    welcomeBack: string
    hello: string
    clockIn: string
    clockOut: string
    clockedInAt: string
    duration: string
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ClockResultDialog({
  open, onOpenChange, username, clockedIn, currentEntry,
  loading, onClockIn, onClockOut, t,
}: ClockResultDialogProps) {
  const elapsed = currentEntry
    ? Math.round((Date.now() - new Date(currentEntry.clockIn).getTime()) / 60000)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {clockedIn
              ? t.hello.replace('{name}', username)
              : t.welcomeBack.replace('{name}', username)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {clockedIn && currentEntry && (
            <div className="text-center text-muted-foreground space-y-1">
              <p>{t.clockedInAt.replace('{time}', formatTime(currentEntry.clockIn))}</p>
              <p>{t.duration.replace('{duration}', formatDuration(elapsed))}</p>
            </div>
          )}

          {clockedIn ? (
            <Button
              size="lg"
              variant="destructive"
              className="w-full max-w-[200px] h-14 text-lg min-h-[56px]"
              disabled={loading}
              onClick={onClockOut}
            >
              {t.clockOut}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full max-w-[200px] h-14 text-lg min-h-[56px]"
              disabled={loading}
              onClick={onClockIn}
            >
              {t.clockIn}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
