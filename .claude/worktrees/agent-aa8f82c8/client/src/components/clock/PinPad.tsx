import { Button } from '@/components/ui/button'

interface PinPadProps {
  pin: string
  onDigit: (d: string) => void
  onBackspace: () => void
  disabled?: boolean
  enterPinLabel: string
}

export default function PinPad({ pin, onDigit, onBackspace, disabled, enterPinLabel }: PinPadProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-lg text-muted-foreground">{enterPinLabel}</p>

      {/* PIN dots */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <Button
            key={d}
            variant="outline"
            className="h-16 text-2xl font-medium min-h-[64px]"
            disabled={disabled || pin.length >= 4}
            onClick={() => onDigit(d)}
          >
            {d}
          </Button>
        ))}
        <div /> {/* empty cell */}
        <Button
          variant="outline"
          className="h-16 text-2xl font-medium min-h-[64px]"
          disabled={disabled || pin.length >= 4}
          onClick={() => onDigit('0')}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className="h-16 text-xl min-h-[64px]"
          disabled={disabled || pin.length === 0}
          onClick={onBackspace}
        >
          &#9003;
        </Button>
      </div>
    </div>
  )
}
