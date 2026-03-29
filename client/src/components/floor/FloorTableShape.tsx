import type { Table } from '@qr-order/shared'

const STATUS_COLORS: Record<string, string> = {
  idle: '#22c55e',       // green
  occupied: '#ef4444',   // red
  cleaning: '#eab308',   // yellow
  'bill-requested': '#f97316', // orange
}

interface Props {
  table: Table
  selected?: boolean
  editable?: boolean
  onClick?: () => void
}

export function FloorTableShape({ table, selected, onClick }: Props) {
  const x = table.x ?? 0
  const y = table.y ?? 0
  const w = table.width ?? 80
  const h = table.height ?? 80
  const color = table.enabled ? (STATUS_COLORS[table.status] || '#94a3b8') : '#d1d5db'
  const opacity = table.enabled ? 1 : 0.4

  const shape = table.shape ?? 'square'
  // Actual rendered height depends on shape
  const renderH = shape === 'long' ? h * 0.6 : shape === 'round' ? h * 0.76 : h
  const cy = renderH / 2

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', opacity }}
    >
      {shape === 'round' ? (
        <ellipse
          cx={w / 2} cy={cy} rx={w / 2} ry={renderH / 2}
          fill={color} fillOpacity={0.2}
          stroke={selected ? '#2563eb' : color} strokeWidth={selected ? 2.5 : 1.5}
        />
      ) : (
        <rect
          width={w} height={renderH}
          rx={6} ry={6}
          fill={color} fillOpacity={0.2}
          stroke={selected ? '#2563eb' : color} strokeWidth={selected ? 2.5 : 1.5}
        />
      )}
      <text
        x={w / 2} y={cy - 4}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight={600} fill="#1f2937"
      >
        #{table.number}
      </text>
      {table.name && (
        <text
          x={w / 2} y={cy + 10}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="#6b7280"
        >
          {table.name.length > 8 ? table.name.slice(0, 7) + '\u2026' : table.name}
        </text>
      )}
    </g>
  )
}
