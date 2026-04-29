import type { ReactNode } from 'react'

interface CustomerPageFrameProps {
  children: ReactNode
}

export default function CustomerPageFrame({ children }: CustomerPageFrameProps) {
  return (
    <div className="max-w-lg mx-auto relative min-h-screen bg-background">
      {children}
    </div>
  )
}
