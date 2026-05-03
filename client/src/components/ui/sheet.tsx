import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/** Pixels of vertical drag from the grabber zone needed to dismiss a bottom sheet. */
const SWIPE_DOWN_CLOSE_THRESHOLD = 80

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const startYRef = React.useRef<number | null>(null)
  const [dragY, setDragY] = React.useState(0)

  // Bottom sheets get a swipe-down-to-close grabber zone.
  // Drag handlers are wired on a thin top strip — content body scrolls natively.
  const onGrabberTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }
  const onGrabberTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return
    const dy = e.touches[0].clientY - startYRef.current
    setDragY(Math.max(0, dy))
  }
  const onGrabberTouchEnd = () => {
    if (dragY >= SWIPE_DOWN_CLOSE_THRESHOLD) closeRef.current?.click()
    setDragY(0)
    startYRef.current = null
  }

  const isBottom = side === "bottom"
  const dragStyle: React.CSSProperties | undefined = isBottom && dragY > 0
    ? { transform: `translateY(${dragY}px)`, transition: "none" }
    : isBottom
      ? { transition: "transform 200ms ease-out" }
      : undefined

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        aria-describedby={undefined}
        data-slot="sheet-content"
        style={dragStyle}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background shadow-ambient transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {isBottom && (
          <div
            data-slot="sheet-grabber"
            onTouchStart={onGrabberTouchStart}
            onTouchMove={onGrabberTouchMove}
            onTouchEnd={onGrabberTouchEnd}
            onTouchCancel={onGrabberTouchEnd}
            className="absolute inset-x-0 top-0 flex justify-center pt-2 pb-2 z-10 cursor-grab touch-none"
            aria-hidden="true"
          >
            <span className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            ref={closeRef}
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
