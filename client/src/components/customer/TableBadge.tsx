interface TableBadgeProps {
  tableName: string
  showPulse?: boolean
}

export default function TableBadge({ tableName, showPulse = true }: TableBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`Table ${tableName}`}
      className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-label text-label-sm rounded-full px-3 py-1"
    >
      {showPulse && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
        />
      )}
      {tableName}
    </span>
  )
}
