import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPriceCNY } from '@/lib/format'
import type { Order, OrderItem } from '@qr-order/shared'

function itemUnitPrice(item: OrderItem): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  order: Order
  storeName?: string
}

const OrderReceipt = forwardRef<HTMLDivElement, Props>(({ order, storeName }, ref) => {
  const { t } = useTranslation('admin')
  return (
    <div ref={ref} className="receipt-print">
      <style>{`
        .receipt-print {
          width: 280px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.5;
          padding: 12px;
        }
        @media (max-width: 640px) {
          .receipt-print {
            padding: 12px;
          }
        }
        @media (min-width: 641px) {
          .receipt-print {
            padding: 16px;
          }
        }
        .receipt-print .receipt-center { text-align: center; }
        .receipt-print .receipt-bold { font-weight: bold; }
        .receipt-print .receipt-divider {
          border-top: 1px dashed #333;
          margin: 6px 0;
        }
        .receipt-print .receipt-row {
          display: flex;
          justify-content: space-between;
        }
        .receipt-print .receipt-item-detail {
          padding-left: 12px;
          font-size: 11px;
          color: #555;
        }
        .receipt-print .receipt-total {
          font-size: 16px;
          font-weight: bold;
        }
      `}</style>

      {/* Store name */}
      <div className="receipt-center receipt-bold" style={{ fontSize: 16, marginBottom: 4 }}>
        {storeName ?? t('receipt.title')}
      </div>

      <div className="receipt-divider" />

      {/* Order info */}
      <div className="receipt-row">
        <span>{t('receipt.orderNumber')}</span>
        <span className="receipt-bold">#{order.orderNumber}</span>
      </div>
      <div className="receipt-row">
        <span>{t('receipt.table')}</span>
        <span>{order.tableName}</span>
      </div>
      {order.customerName && (
        <div className="receipt-row">
          <span>{t('receipt.customer')}</span>
          <span>{order.customerName}</span>
        </div>
      )}
      <div className="receipt-row">
        <span>{t('receipt.time')}</span>
        <span>{formatTime(order.createdAt)}</span>
      </div>

      <div className="receipt-divider" />

      {/* Items */}
      {order.items.map((item, idx) => (
        <div key={idx}>
          <div className="receipt-row">
            <span>{item.name} x{item.quantity}</span>
            <span>{formatPriceCNY(itemUnitPrice(item) * item.quantity)}</span>
          </div>
          {item.selectedOptions && item.selectedOptions.length > 0 && (
            <div className="receipt-item-detail">
              {item.selectedOptions.map(o => o.choiceName).join(', ')}
            </div>
          )}
          {item.remark && (
            <div className="receipt-item-detail">*{item.remark}</div>
          )}
        </div>
      ))}

      <div className="receipt-divider" />

      {/* Total */}
      <div className="receipt-row receipt-total">
        <span>{t('common:total')}</span>
        <span>{formatPriceCNY(order.totalPrice)}</span>
      </div>

      <div className="receipt-divider" />

      <div className="receipt-center" style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
        {t('receipt.thanks')}
      </div>
    </div>
  )
})

OrderReceipt.displayName = 'OrderReceipt'

export default OrderReceipt
