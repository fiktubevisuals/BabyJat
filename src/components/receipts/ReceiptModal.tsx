import { useState, useRef } from 'react';

export interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  type?: 'service' | 'product';
}

export interface ReceiptData {
  receiptNumber: string;
  orderId?: string;
  appointmentId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  stylistName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  discountCode?: string;
  tax?: number;
  total: number;
  paymentMethod: string;
  paymentReference?: string;
  createdAt: string | Date;
  notes?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData;
}

export function ReceiptModal({ isOpen, onClose, data }: ReceiptModalProps) {
  const [viewMode, setViewMode] = useState<'thermal' | 'invoice'>('thermal');
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = (data.clientPhone || '+256700000000').replace(/[^0-9]/g, '');
    const itemsList = data.items
      .map(i => `• ${i.quantity}x ${i.name} - UGX ${(i.price * i.quantity).toLocaleString()}`)
      .join('\n');

    const msg = `👑 *BABYJAT LUXURY SALON RECEIPT* 👑
----------------------------------
*Receipt #:* ${data.receiptNumber}
*Date:* ${formattedDate}
*Client:* ${data.clientName}
${data.stylistName ? `*Stylist:* ${data.stylistName}\n` : ''}
*Items:*
${itemsList}

*Subtotal:* UGX ${data.subtotal.toLocaleString()}
${data.discount ? `*Discount (${data.discountCode || 'Promo'}):* -UGX ${data.discount.toLocaleString()}\n` : ''}*Total Paid:* UGX ${data.total.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
${data.paymentReference ? `*Txn Ref:* ${data.paymentReference}\n` : ''}
----------------------------------
Thank you for indulging in luxury with BabyJat! 💎
Visit us: https://babyjat.com`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Container Dialog */}
      <div className="bg-surface w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative border border-outline/10 my-auto text-on-surface print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-outline/10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
            <div>
              <h3 className="font-headline-md text-lg leading-tight">Official Salon Receipt</h3>
              <p className="text-xs text-secondary">Receipt #{data.receiptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-surface-container-low p-1 rounded-xl border border-outline/10 flex gap-1 text-xs font-label-caps">
              <button
                type="button"
                onClick={() => setViewMode('thermal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'thermal' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs">print</span>
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setViewMode('invoice')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'invoice' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs">description</span>
                A4 Invoice
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low ml-2"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* --- PRINTABLE BODY --- */}
        <div ref={printRef} className="overflow-y-auto max-h-[65vh] p-2 flex justify-center print:max-h-none print:overflow-visible print:p-0">
          
          {/* ======================================================== */}
          {/* 1. 80MM THERMAL RECEIPT LAYOUT */}
          {/* ======================================================== */}
          {viewMode === 'thermal' && (
            <div className="w-[310px] bg-white text-black p-5 rounded-xl shadow-md border border-neutral-300 font-mono text-[12px] leading-tight select-text print:w-[76mm] print:shadow-none print:border-none print:p-0 print:m-0">
              
              {/* Salon Header */}
              <div className="text-center pb-3 border-b border-dashed border-black/60">
                <div className="font-bold text-sm tracking-tight uppercase">BABYJAT LUXURY SALON</div>
                <div className="text-[10px] text-neutral-700 mt-0.5">&amp; EXCLUSIVE BOUTIQUE</div>
                <div className="text-[9px] text-neutral-600 mt-1">Acacia Mall Blvd, Kampala, Uganda</div>
                <div className="text-[9px] text-neutral-600">Tel: +256 700 000 000</div>
                <div className="text-[9px] text-neutral-600">TIN: 1004829104 | VAT Reg: YES</div>
              </div>

              {/* Metadata */}
              <div className="py-2.5 border-b border-dashed border-black/60 text-[10.5px] space-y-1">
                <div className="flex justify-between">
                  <span>REC #:</span>
                  <span className="font-bold">{data.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENT:</span>
                  <span className="font-bold uppercase truncate max-w-[170px]">{data.clientName}</span>
                </div>
                {data.stylistName && (
                  <div className="flex justify-between">
                    <span>STYLIST:</span>
                    <span className="font-bold">{data.stylistName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>POS Terminal #1</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2.5 border-b border-dashed border-black/60">
                <div className="flex justify-between font-bold text-[10.5px] pb-1.5 border-b border-black/20">
                  <span className="w-8">QTY</span>
                  <span className="flex-1 px-1">ITEM</span>
                  <span className="text-right">AMT (UGX)</span>
                </div>

                <div className="space-y-1.5 pt-1.5">
                  {data.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] items-start">
                      <span className="w-8 font-bold">{item.quantity}x</span>
                      <span className="flex-1 px-1 leading-tight">{item.name}</span>
                      <span className="text-right font-bold shrink-0">
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-2.5 border-b border-dashed border-black/60 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>UGX {data.subtotal.toLocaleString()}</span>
                </div>

                {Boolean(data.discount) && (
                  <div className="flex justify-between font-bold text-neutral-800">
                    <span>DISCOUNT ({data.discountCode || 'Promo'}):</span>
                    <span>-UGX {data.discount?.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[10px] text-neutral-600">
                  <span>VAT (18% INCLUDED):</span>
                  <span>UGX {Math.round(data.total * 0.18 / 1.18).toLocaleString()}</span>
                </div>

                <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-black/30">
                  <span>TOTAL PAID:</span>
                  <span>UGX {data.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2 border-b border-dashed border-black/60 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>PAYMENT METHOD:</span>
                  <span className="font-bold uppercase">{data.paymentMethod}</span>
                </div>
                {data.paymentReference && (
                  <div className="flex justify-between">
                    <span>TXN REF:</span>
                    <span className="font-bold">{data.paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span className="font-bold text-emerald-800">SETTLED / PAID</span>
                </div>
              </div>

              {/* Thermal Footer */}
              <div className="text-center pt-3 space-y-1 text-[9.5px]">
                <div className="font-bold tracking-wider">✨ THANK YOU FOR YOUR VISIT ✨</div>
                <div className="text-neutral-600">Exchange or salon inquiries within 7 days with valid receipt.</div>
                <div className="font-bold text-[10px] pt-1">www.babyjat.com</div>
                <div className="text-[8px] text-neutral-400">--- END OF RECEIPT ---</div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 2. LUXURY A4 INVOICE LAYOUT */}
          {/* ======================================================== */}
          {viewMode === 'invoice' && (
            <div className="w-full bg-white text-neutral-900 p-8 rounded-2xl shadow-lg border border-neutral-200 text-sm print:shadow-none print:border-none print:p-0">
              
              {/* Header */}
              <div className="flex justify-between items-start pb-6 border-b border-neutral-200">
                <div>
                  <h1 className="font-headline-md text-2xl font-bold text-primary tracking-tight">BabyJat</h1>
                  <p className="font-label-caps text-xs text-neutral-500 tracking-wider uppercase">Luxury Salon &amp; Boutique</p>
                  <p className="text-xs text-neutral-600 mt-2">
                    Acacia Mall Boulevard, Level 2<br />
                    Kampala, Uganda<br />
                    TIN: 1004829104 | VAT Reg. No: 4892019<br />
                    Email: concierge@babyjat.com | Phone: +256 700 000 000
                  </p>
                </div>

                <div className="text-right">
                  <span className="bg-primary/10 text-primary font-label-caps text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Tax Invoice / Receipt
                  </span>
                  <p className="font-headline-md text-lg font-bold mt-2">#{data.receiptNumber}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Date: {formattedDate}</p>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-6 py-6 border-b border-neutral-100 text-xs">
                <div>
                  <h4 className="font-label-caps text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1">
                    Billed To:
                  </h4>
                  <p className="font-bold text-sm text-neutral-900">{data.clientName}</p>
                  {data.clientPhone && <p className="text-neutral-600">Phone: {data.clientPhone}</p>}
                  {data.clientEmail && <p className="text-neutral-600">Email: {data.clientEmail}</p>}
                </div>

                <div className="text-right">
                  <h4 className="font-label-caps text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1">
                    Service Details:
                  </h4>
                  {data.stylistName && <p className="text-neutral-700">Stylist: <strong className="text-neutral-900">{data.stylistName}</strong></p>}
                  <p className="text-neutral-700">Payment Method: <strong className="text-neutral-900">{data.paymentMethod}</strong></p>
                  {data.paymentReference && <p className="text-neutral-700">Reference: <span className="font-mono">{data.paymentReference}</span></p>}
                </div>
              </div>

              {/* Items Table */}
              <div className="py-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 font-label-caps text-neutral-500 uppercase">
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-center">Category</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price (UGX)</th>
                      <th className="pb-2 text-right">Amount (UGX)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-semibold text-neutral-900">{item.name}</td>
                        <td className="py-3 text-center capitalize text-neutral-500">{item.type || 'Service'}</td>
                        <td className="py-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-3 text-right font-mono">{item.price.toLocaleString()}</td>
                        <td className="py-3 text-right font-mono font-bold">{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Calculation */}
              <div className="pt-4 border-t border-neutral-200 flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">UGX {data.subtotal.toLocaleString()}</span>
                  </div>

                  {Boolean(data.discount) && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({data.discountCode || 'Promo'}):</span>
                      <span className="font-mono">-UGX {data.discount?.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-500 text-[11px]">
                    <span>VAT (18% Included):</span>
                    <span className="font-mono">UGX {Math.round(data.total * 0.18 / 1.18).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-base font-bold text-primary pt-2 border-t border-neutral-200">
                    <span>Total Paid:</span>
                    <span className="font-mono">UGX {data.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="mt-8 pt-6 border-t border-neutral-100 text-center text-xs text-neutral-500">
                <p className="font-semibold text-neutral-700">Thank you for indulging with BabyJat Luxury Salon &amp; Boutique.</p>
                <p className="text-[11px] mt-0.5">Official Tax Receipt generated by BabyJat Automated Billing Engine.</p>
              </div>

            </div>
          )}

        </div>

        {/* Action Buttons Bar (Hidden in Print) */}
        <div className="pt-4 mt-4 border-t border-outline/10 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-label-caps text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>WhatsApp Receipt</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-label-caps text-xs font-bold transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-caps text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print {viewMode === 'thermal' ? '80mm Receipt' : 'A4 Invoice'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
