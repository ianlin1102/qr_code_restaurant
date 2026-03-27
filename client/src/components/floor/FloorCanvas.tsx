import { useRef, useMemo } from 'react'
import type { Table } from '@qr-order/shared'
import { FloorTableShape } from './FloorTableShape'

interface Props {
  tables: Table[]
  editable?: boolean
  selectedTableId?: string | null
  onTableClick?: (table: Table) => void
  onTableMove?: (tableId: string, x: number, y: number) => void
  className?: string
}

const GRID_SIZE = 20
const CANVAS_W = 800
const CANVAS_H = 600

export function FloorCanvas({
  tables, editable, selectedTableId, onTableClick, onTableMove, className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{
    id: string; startX: number; startY: number; origX: number; origY: number
  } | null>(null)

  /* --- Shared helpers for mouse & touch --- */
  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  const startDrag = (table: Table, clientX: number, clientY: number) => {
    if (!editable || !onTableMove) return
    const svgPt = toSvgPoint(clientX, clientY)
    dragRef.current = {
      id: table.id,
      startX: svgPt.x,
      startY: svgPt.y,
      origX: table.x ?? 0,
      origY: table.y ?? 0,
    }
  }

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current || !svgRef.current) return
    const svgPt = toSvgPoint(clientX, clientY)
    const dx = svgPt.x - dragRef.current.startX
    const dy = svgPt.y - dragRef.current.startY
    const newX = Math.round((dragRef.current.origX + dx) / GRID_SIZE) * GRID_SIZE
    const newY = Math.round((dragRef.current.origY + dy) / GRID_SIZE) * GRID_SIZE
    onTableMove?.(dragRef.current.id, Math.max(0, newX), Math.max(0, newY))
  }

  const endDrag = () => { dragRef.current = null }

  /* --- Mouse handlers --- */
  const handleMouseDown = (table: Table, e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(table, e.clientX, e.clientY)
  }
  const handleMouseMove = (e: React.MouseEvent) => moveDrag(e.clientX, e.clientY)
  const handleMouseUp = () => endDrag()

  /* --- Touch handlers --- */
  const handleTouchStart = (table: Table, e: React.TouchEvent) => {
    const touch = e.touches[0]
    startDrag(table, touch.clientX, touch.clientY)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current) return
    e.preventDefault()           // prevent scroll while dragging
    const touch = e.touches[0]
    moveDrag(touch.clientX, touch.clientY)
  }
  const handleTouchEnd = () => endDrag()

  /* --- Memoized grid lines (static, never changes) --- */
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = []
    for (let x = 0; x <= CANVAS_W; x += GRID_SIZE) {
      lines.push(
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={CANVAS_H}
          stroke="#f0f0f0" strokeWidth={0.5} />,
      )
    }
    for (let y = 0; y <= CANVAS_H; y += GRID_SIZE) {
      lines.push(
        <line key={`h${y}`} x1={0} y1={y} x2={CANVAS_W} y2={y}
          stroke="#f0f0f0" strokeWidth={0.5} />,
      )
    }
    return lines
  }, [])

  const placedTables = tables.filter(t => t.x != null && t.y != null)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className={`w-full border rounded-lg bg-white ${className || ''}`}
      style={{ minHeight: 300 }}
      onMouseMove={editable ? handleMouseMove : undefined}
      onMouseUp={editable ? handleMouseUp : undefined}
      onMouseLeave={editable ? handleMouseUp : undefined}
      onTouchMove={editable ? handleTouchMove : undefined}
      onTouchEnd={editable ? handleTouchEnd : undefined}
      onTouchCancel={editable ? handleTouchEnd : undefined}
    >
      {gridLines}
      {placedTables.map(table => (
        <g
          key={table.id}
          onMouseDown={editable ? (e) => handleMouseDown(table, e) : undefined}
          onTouchStart={editable ? (e) => handleTouchStart(table, e) : undefined}
        >
          <FloorTableShape
            table={table}
            selected={selectedTableId === table.id}
            editable={editable}
            onClick={() => onTableClick?.(table)}
          />
        </g>
      ))}
    </svg>
  )
}
