import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
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
const CANVAS_W = 1200
const CANVAS_H = 900
const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.0
const ZOOM_STEP = 0.15

export function FloorCanvas({
  tables, editable, selectedTableId, onTableClick, onTableMove, className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef<{
    id: string; startX: number; startY: number; origX: number; origY: number
  } | null>(null)

  /* --- Zoom helpers --- */
  const zoomIn = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), [])

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(z => {
        const next = z - e.deltaY * 0.002
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +next.toFixed(2)))
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

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
  const handleTouchEnd = () => endDrag()

  // Attach touchmove with { passive: false } so preventDefault works
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !editable) return
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const touch = e.touches[0]
      moveDrag(touch.clientX, touch.clientY)
    }
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => svg.removeEventListener('touchmove', onTouchMove)
  }, [editable])

  /* --- Memoized grid lines --- */
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

  // Visible area based on zoom (zoom in = smaller viewBox = see less but bigger)
  const vbW = CANVAS_W / zoom
  const vbH = CANVAS_H / zoom

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 backdrop-blur border rounded-lg px-1 py-0.5 shadow-sm">
        <button onClick={zoomOut} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-base font-mono hover:bg-gray-100 rounded" title="Zoom out">−</button>
        <span className="text-xs font-mono w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-base font-mono hover:bg-gray-100 rounded" title="Zoom in">+</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className={`w-full border rounded-lg bg-white ${className || ''}`}
        style={{ minHeight: 400 }}
        onMouseMove={editable ? handleMouseMove : undefined}
        onMouseUp={editable ? handleMouseUp : undefined}
        onMouseLeave={editable ? handleMouseUp : undefined}
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
    </div>
  )
}
