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
const ZOOM_MIN = 0.3
const ZOOM_MAX = 3.0
const ZOOM_STEP = 0.15

export function FloorCanvas({
  tables, editable, selectedTableId, onTableClick, onTableMove, className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const [zoom, setZoom] = useState(isMobile ? 2 : 1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    id: string; startX: number; startY: number; origX: number; origY: number
  } | null>(null)
  const panRef = useRef<{
    startX: number; startY: number; origOx: number; origOy: number
  } | null>(null)
  const pinchRef = useRef<{
    startDist: number; startZoom: number
  } | null>(null)

  /* --- Helpers --- */
  const clampOffset = useCallback((ox: number, oy: number, z: number) => ({
    x: Math.max(0, Math.min(CANVAS_W - CANVAS_W / z, ox)),
    y: Math.max(0, Math.min(CANVAS_H - CANVAS_H / z, oy)),
  }), [])

  /* --- Zoom helpers --- */
  const zoomIn = useCallback(() => {
    setZoom(z => {
      const next = Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))
      setOffset(o => clampOffset(o.x, o.y, next))
      return next
    })
  }, [clampOffset])

  const zoomOut = useCallback(() => {
    setZoom(z => {
      const next = Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))
      setOffset(o => clampOffset(o.x, o.y, next))
      return next
    })
  }, [clampOffset])

  const zoomReset = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  /* --- Wheel zoom (toward cursor) --- */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const fracX = (e.clientX - rect.left) / rect.width
      const fracY = (e.clientY - rect.top) / rect.height

      setZoom(prevZ => {
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(prevZ - e.deltaY * 0.002).toFixed(2)))
        setOffset(prev => {
          const oldVbW = CANVAS_W / prevZ
          const oldVbH = CANVAS_H / prevZ
          const newVbW = CANVAS_W / next
          const newVbH = CANVAS_H / next
          const cursorSvgX = prev.x + fracX * oldVbW
          const cursorSvgY = prev.y + fracY * oldVbH
          const newOx = cursorSvgX - fracX * newVbW
          const newOy = cursorSvgY - fracY * newVbH
          return clampOffset(newOx, newOy, next)
        })
        return next
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [clampOffset])

  /* --- Shared helpers for mouse & touch table drag --- */
  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }, [])

  const startDrag = useCallback((table: Table, clientX: number, clientY: number) => {
    if (!editable || !onTableMove) return
    const svgPt = toSvgPoint(clientX, clientY)
    dragRef.current = {
      id: table.id,
      startX: svgPt.x,
      startY: svgPt.y,
      origX: table.x ?? 0,
      origY: table.y ?? 0,
    }
  }, [editable, onTableMove, toSvgPoint])

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !svgRef.current) return
    const svgPt = toSvgPoint(clientX, clientY)
    const dx = svgPt.x - dragRef.current.startX
    const dy = svgPt.y - dragRef.current.startY
    const newX = Math.round((dragRef.current.origX + dx) / GRID_SIZE) * GRID_SIZE
    const newY = Math.round((dragRef.current.origY + dy) / GRID_SIZE) * GRID_SIZE
    onTableMove?.(dragRef.current.id, Math.max(0, newX), Math.max(0, newY))
  }, [onTableMove, toSvgPoint])

  const endDrag = useCallback(() => { dragRef.current = null }, [])

  /* --- Mouse handlers --- */
  const handleMouseDown = useCallback((table: Table, e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(table, e.clientX, e.clientY)
  }, [startDrag])

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (editable) return
    panRef.current = {
      startX: e.clientX, startY: e.clientY,
      origOx: offset.x, origOy: offset.y,
    }
  }, [editable, offset])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (editable) {
      moveDrag(e.clientX, e.clientY)
      return
    }
    if (!panRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vbW = CANVAS_W / zoom
    const vbH = CANVAS_H / zoom
    const dx = (e.clientX - panRef.current.startX) * (vbW / rect.width)
    const dy = (e.clientY - panRef.current.startY) * (vbH / rect.height)
    setOffset(clampOffset(panRef.current.origOx - dx, panRef.current.origOy - dy, zoom))
  }, [editable, moveDrag, zoom, clampOffset, offset])

  const handleSvgMouseUp = useCallback(() => {
    panRef.current = null
    endDrag()
  }, [endDrag])

  /* --- Touch handlers (comprehensive useEffect) --- */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start — works in both edit and non-edit modes
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchRef.current = {
          startDist: Math.hypot(dx, dy),
          startZoom: zoom,
        }
        panRef.current = null // cancel any pan
        return
      }
      if (e.touches.length === 1 && !editable) {
        // Single finger pan (non-edit mode)
        const t = e.touches[0]
        panRef.current = {
          startX: t.clientX, startY: t.clientY,
          origOx: offset.x, origOy: offset.y,
        }
      }
      // In edit mode, single-finger table drag is handled by per-table onTouchStart
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault() // prevent browser scroll/zoom

      if (e.touches.length === 2 && pinchRef.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = dist / pinchRef.current.startDist
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(pinchRef.current.startZoom * ratio).toFixed(2)))
        setZoom(next)
        setOffset(o => clampOffset(o.x, o.y, next))
        return
      }

      if (e.touches.length === 1) {
        if (editable && dragRef.current) {
          // Edit mode: drag table
          const t = e.touches[0]
          moveDrag(t.clientX, t.clientY)
          return
        }
        if (!editable && panRef.current) {
          // Non-edit: pan viewport
          const t = e.touches[0]
          const rect = svg.getBoundingClientRect()
          const vbW = CANVAS_W / zoom
          const vbH = CANVAS_H / zoom
          const tdx = (t.clientX - panRef.current.startX) * (vbW / rect.width)
          const tdy = (t.clientY - panRef.current.startY) * (vbH / rect.height)
          setOffset(clampOffset(panRef.current.origOx - tdx, panRef.current.origOy - tdy, zoom))
        }
      }
    }

    const onTouchEnd = () => {
      pinchRef.current = null
      panRef.current = null
      dragRef.current = null
    }

    svg.addEventListener('touchstart', onTouchStart, { passive: false })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    svg.addEventListener('touchend', onTouchEnd)
    svg.addEventListener('touchcancel', onTouchEnd)
    return () => {
      svg.removeEventListener('touchstart', onTouchStart)
      svg.removeEventListener('touchmove', onTouchMove)
      svg.removeEventListener('touchend', onTouchEnd)
      svg.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [editable, zoom, offset, moveDrag, clampOffset])

  /* --- Touch start per-table (edit mode table drag) --- */
  const handleTouchStart = useCallback((table: Table, e: React.TouchEvent) => {
    const touch = e.touches[0]
    startDrag(table, touch.clientX, touch.clientY)
  }, [startDrag])

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

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 backdrop-blur border rounded-lg px-1 py-0.5 shadow-sm">
        <button onClick={zoomOut} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-base font-mono hover:bg-gray-100 rounded" title="Zoom out">−</button>
        <button onClick={zoomReset} className="text-xs font-mono w-10 text-center select-none hover:bg-gray-100 rounded py-1" title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-base font-mono hover:bg-gray-100 rounded" title="Zoom in">+</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${offset.x} ${offset.y} ${CANVAS_W / zoom} ${CANVAS_H / zoom}`}
        className={`w-full border rounded-lg bg-white touch-none ${className || ''}`}
        style={{ minHeight: 400, cursor: editable ? undefined : 'grab' }}
        onMouseDown={editable ? undefined : handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
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
