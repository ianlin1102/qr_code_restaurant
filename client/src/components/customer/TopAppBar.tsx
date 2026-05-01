import { useState } from 'react'
import { Bell, ChevronLeft, Languages, Search, UtensilsCrossed, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import TableBadge from './TableBadge'
import ServiceMenuSheet from './ServiceMenuSheet'

export interface TopAppBarProps {
  mode: 'menu' | 'cart'
  storeName?: string
  storeNameEn?: string
  tableName?: string | null
  customerName?: string | null

  // Menu mode — search (controlled)
  searchExpanded?: boolean
  searchValue?: string
  onSearchToggle?: () => void
  onSearchChange?: (v: string) => void

  // Menu mode — actions
  onCallService?: () => void
  onRequestBill?: () => void
  onLanguageToggle?: () => void
  onCustomerNameClick?: () => void
  currentLang?: 'zh' | 'en'

  // Cart mode
  onBack?: () => void
}

const labels = {
  zh: {
    search: '搜索',
    callService: '呼叫服务员',
    requestBill: '索要账单',
    langToggle: 'EN',
    back: '返回',
    setName: '+ 姓名',
    cartTitle: '购物车',
    cartTitleAlt: 'Shopping Cart',
  },
  en: {
    search: 'Search',
    callService: 'Call service',
    requestBill: 'Request bill',
    langToggle: '中',
    back: 'Back',
    setName: '+ Name',
    cartTitle: 'Shopping Cart',
    cartTitleAlt: '购物车',
  },
} as const

export default function TopAppBar(props: TopAppBarProps) {
  if (props.mode === 'cart') return <CartTopBar {...props} />
  return <MenuTopBar {...props} />
}

function MenuTopBar({
  storeName,
  tableName,
  customerName,
  searchExpanded = false,
  searchValue = '',
  onSearchToggle,
  onSearchChange,
  onCallService,
  onRequestBill,
  onLanguageToggle,
  onCustomerNameClick,
  currentLang = 'en',
}: TopAppBarProps) {
  const L = labels[currentLang]
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false)
  return (
    <header className="glass border-b border-border fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg h-16 flex items-center px-4 gap-2">
      {/* Brand: icon always; text hidden on small screens or when search is expanded */}
      <div
        className={cn(
          'flex items-center gap-2 min-w-0 transition-all duration-200',
          searchExpanded && 'opacity-0 max-w-0 overflow-hidden',
        )}
      >
        <UtensilsCrossed className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
        <h1 className="font-display font-bold text-primary truncate hidden sm:inline">
          {storeName}
        </h1>
      </div>

      {/* Search input — fills center when expanded */}
      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          searchExpanded ? 'flex-1 max-w-full opacity-100' : 'max-w-0 opacity-0',
        )}
      >
        <Input
          autoFocus={searchExpanded}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={L.search}
          aria-label={L.search}
          aria-expanded={searchExpanded}
          className="bg-card border-border h-10"
        />
      </div>

      {!searchExpanded && <div className="flex-1" />}

      {/* Right cluster */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onSearchToggle}
          aria-label={L.search}
        >
          {searchExpanded ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </Button>
        {!searchExpanded && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setServiceSheetOpen(true)}
              aria-label={L.callService}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onLanguageToggle}
              aria-label={L.langToggle}
            >
              <Languages className="h-5 w-5" />
            </Button>
            {tableName && <TableBadge tableName={tableName} />}
            {customerName ? (
              <button
                type="button"
                onClick={onCustomerNameClick}
                className="text-muted-foreground text-sm hidden md:inline truncate max-w-[80px] hover:text-foreground"
              >
                {customerName}
              </button>
            ) : onCustomerNameClick ? (
              <button
                type="button"
                onClick={onCustomerNameClick}
                className="text-muted-foreground text-xs hidden md:inline underline"
              >
                {L.setName}
              </button>
            ) : null}
          </>
        )}
      </div>
      <ServiceMenuSheet
        open={serviceSheetOpen}
        onOpenChange={setServiceSheetOpen}
        onCallWaiter={() => onCallService?.()}
        onRequestBill={() => onRequestBill?.()}
        currentLang={currentLang}
      />
    </header>
  )
}

function CartTopBar({ tableName, currentLang = 'en', onBack }: TopAppBarProps) {
  const L = labels[currentLang]
  return (
    <header className="glass border-b border-border fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg h-14 flex items-center px-4 gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onBack}
        aria-label={L.back}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h1 className="flex-1 font-display font-semibold text-base truncate">
        {L.cartTitle}
        <span className="text-muted-foreground font-normal text-sm ml-1.5">
          / {L.cartTitleAlt}
        </span>
      </h1>
      {tableName && <TableBadge tableName={tableName} />}
    </header>
  )
}
