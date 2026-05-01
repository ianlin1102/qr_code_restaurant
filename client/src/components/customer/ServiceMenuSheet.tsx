import { Bell, Receipt } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface ServiceMenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCallWaiter: () => void
  onRequestBill: () => void
  currentLang?: 'zh' | 'en'
}

const labels = {
  zh: {
    title: '呼叫服务员',
    callWaiter: '普通呼叫',
    callWaiterDesc: '请服务员到您的桌位',
    requestBill: '请求结账',
    requestBillDesc: '通知服务员准备账单',
    cancel: '取消',
  },
  en: {
    title: 'Call Service',
    callWaiter: 'Call Waiter',
    callWaiterDesc: 'Request a waiter to your table',
    requestBill: 'Request Bill',
    requestBillDesc: 'Notify staff to prepare your bill',
    cancel: 'Cancel',
  },
} as const

export default function ServiceMenuSheet({
  open,
  onOpenChange,
  onCallWaiter,
  onRequestBill,
  currentLang = 'en',
}: ServiceMenuSheetProps) {
  const t = labels[currentLang]

  const handleCallWaiter = () => {
    onCallWaiter()
    onOpenChange(false)
  }
  const handleRequestBill = () => {
    onRequestBill()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-safe max-w-lg mx-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-headline-md">
            {t.title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 mt-4 px-4">
          <button
            type="button"
            onClick={handleCallWaiter}
            aria-label={t.callWaiter}
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-base">{t.callWaiter}</p>
              <p className="text-sm text-muted-foreground">{t.callWaiterDesc}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleRequestBill}
            aria-label={t.requestBill}
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-base">{t.requestBill}</p>
              <p className="text-sm text-muted-foreground">{t.requestBillDesc}</p>
            </div>
          </button>
        </div>

        <SheetFooter className="mt-4">
          <SheetClose asChild>
            <Button variant="outline" className="w-full font-display rounded-xl">
              {t.cancel}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
