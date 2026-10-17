import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Package, Truck, ArrowLeft, AlertCircle, Printer, Mail, FileText, X } from 'lucide-react';
import type { Order } from '../types/index.ts';
import { RangrezLogo } from '../components/RangrezLogo.tsx';

interface OrderSuccessPageProps {
  orderId: string;
  navigate: (path: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ orderId, navigate }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchOrder = (contactInfo?: string) => {
    setLoading(true);
    setError(null);

    let query = '';
    const storedToken =
      new URLSearchParams(window.location.search).get('token') ||
      sessionStorage.getItem(`rangrez_order_token_${orderId}`) ||
      '';

    if (storedToken) {
      query = `?token=${encodeURIComponent(storedToken)}`;
    } else if (contactInfo && contactInfo.trim()) {
      const clean = contactInfo.trim();
      query = `?email=${encodeURIComponent(clean)}&phone=${encodeURIComponent(clean)}`;
    }

    fetch(`/api/orders/${orderId}${query}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setOrder(data);
          setError(null);
          if (data.orderAccessToken) {
            try {
              sessionStorage.setItem(`rangrez_order_token_${data.id}`, data.orderAccessToken);
            } catch {}
          }
        } else {
          setError(data?.error || 'Order could not be located');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setLoading(false);
        setVerifying(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-white">
        <div className="w-12 h-12 border-2 border-[#E07A24] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400">Retrieving order details from atelier records...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-white">
        <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-9 h-9 text-[#E07A24] mx-auto" />
          <div>
            <h2 className="text-base font-bold font-serif-brand text-white">Private Order Verification</h2>
            <p className="text-xs text-gray-400 mt-1">
              Customer orders and delivery addresses are kept strictly confidential. Please enter the email or phone number used for this order to view your receipt.
            </p>
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (verificationInput.trim()) {
                setVerifying(true);
                fetchOrder(verificationInput);
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              required
              value={verificationInput}
              onChange={e => setVerificationInput(e.target.value)}
              placeholder="Enter your phone or email"
              className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#E07A24]"
            />
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {verifying ? 'Verifying Atelier Records...' : 'Verify & View Receipt'}
            </button>
          </form>
          <div className="pt-2 border-t border-[#1C212E]">
            <button
              onClick={() => navigate('/shop')}
              className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              Return to Atelier Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCod = order.paymentMethod === 'COD';
  const taxableSubtotal = Math.round((order.subtotal / 1.05) * 100) / 100;
  const gstAmount = Math.round((order.subtotal - taxableSubtotal) * 100) / 100;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* SCREEN VIEW (Hidden when printing via index.css) */}
      {/* ------------------------------------------------------------------ */}
      <div className="no-print max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </button>

        {/* Confirmation Banner */}
        <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
          <div className="flex justify-center mb-6">
            <RangrezLogo variant="full" size="md" light={true} />
          </div>

          <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold mb-1">
            Atelier Order Confirmed
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand mb-2">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-[#9CA3AF] max-w-md mx-auto mb-5">
            Thank you, {order.shippingAddress.fullName}. We have received your order and queued our dye-house dispatch.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer hover:border-[#E07A24]"
            >
              <FileText className="w-4 h-4 text-[#E07A24]" />
              View Tax Invoice
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#E07A24] hover:bg-[#C96617] rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-orange-950/40"
            >
              <Printer className="w-4 h-4" />
              Print Invoice
            </button>
            <button
              onClick={() => setShowEmailPreview(prev => !prev)}
              className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded-lg text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              {showEmailPreview ? 'Hide Dispatch Email' : 'Preview Dispatch Email'}
            </button>
          </div>

          {/* Email Preview Accordion */}
          {showEmailPreview && (
            <div className="mt-6 p-6 bg-[#0B0D12] border border-[#232938] rounded-xl text-left text-xs text-gray-300 space-y-4 font-sans shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
                <RangrezLogo variant="horizontal" size="sm" light={true} />
                <span className="text-[10px] text-gray-500 font-mono">From: orders@rangrez.in</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Subject: Your RANGREZ Order #{order.orderNumber} is Confirmed</p>
                <p className="text-gray-400 mt-1">To: {order.shippingAddress.email}</p>
              </div>
              <p>Dear {order.shippingAddress.fullName},</p>
              <p>Your order for artisanal heavyweight tees is being carefully prepared at the RANGREZ dye-works.</p>
              <div className="p-3 bg-[#12151D] rounded border border-[#232938] space-y-1 font-mono text-[11px]">
                <p className="text-white font-bold">Order Reference: {order.orderNumber}</p>
                <p>Payment Mode: {order.paymentMethod} ({order.paymentStatus === 'PAID' ? 'Verified' : 'Due at Doorstep: ₹' + order.totalAmount})</p>
                <p>Destination: {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
              </div>
              <p className="text-[11px] text-[#E07A24] italic font-serif">"Wear the Colours of Your Story" &mdash; The RANGREZ Team</p>
            </div>
          )}

          {/* Live Status Indicators */}
          <div className="mt-8 pt-6 border-t border-[#1C212E] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-[#0B0D12] p-4 rounded-xl border border-[#232938]">
              <span className="text-[11px] text-gray-500 block mb-1">Payment Status</span>
              <span className={`text-xs font-bold ${
                order.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {order.paymentStatus === 'PAID' ? 'PAID (Verified)' : 'COD PENDING (Doorstep)'}
              </span>
            </div>

            <div className="bg-[#0B0D12] p-4 rounded-xl border border-[#232938]">
              <span className="text-[11px] text-gray-500 block mb-1">Fulfilment Status</span>
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {order.fulfillmentStatus === 'SENT_TO_QIKINK'
                  ? 'Routed to Qikink'
                  : order.fulfillmentStatus === 'DELIVERED'
                  ? 'Delivered'
                  : 'Processing in Atelier'}
              </span>
            </div>

            <div className="bg-[#0B0D12] p-4 rounded-xl border border-[#232938]">
              <span className="text-[11px] text-gray-500 block mb-1">Courier AWB</span>
              <span className="text-xs font-mono font-medium text-gray-300">
                {order.qikinkAwb ? order.qikinkAwb : 'Assigned upon packing'}
              </span>
            </div>
          </div>

          {order.qikinkOrderId && (
            <div className="mt-4 text-xs text-left text-gray-400 font-mono bg-[#0B0D12] p-3 rounded-lg border border-[#232938]">
              <span>Qikink Reference ID: </span>
              <span className="text-white font-bold">{order.qikinkOrderId}</span>
            </div>
          )}
        </div>

        {/* Itemized Order Details */}
        <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-6 mb-8 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
            Garment Details
          </h2>

          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 py-2 border-b border-[#1C212E] last:border-0">
                <div className="w-14 h-18 bg-[#1A1E29] rounded-lg border border-[#2B3245] overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded" />
                  ) : (
                    <RangrezLogo variant="icon" size="sm" light={true} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate">{item.productName}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Colour: <span className="text-gray-200">{item.colorName}</span> &middot; Size: <span className="font-mono text-gray-200">{item.size}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                    SKU: {item.productSku}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-white tabular-nums">
                    ₹{item.totalPrice}
                  </span>
                  <span className="block text-[10px] text-gray-500 font-mono">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="pt-4 border-t border-[#232938] space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-white font-mono tabular-nums">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className="text-white font-mono tabular-nums">
                {order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}
              </span>
            </div>
            {order.codFee > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>COD Handling</span>
                <span className="text-white font-mono tabular-nums">₹{order.codFee}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Coupon Discount ({order.couponCode})</span>
                <span className="font-mono tabular-nums">-₹{order.discount}</span>
              </div>
            )}
            <div className="pt-3 border-t border-[#232938] flex justify-between text-sm font-bold">
              <span className="text-white">
                {isCod ? 'Total Payable (Due at Doorstep)' : 'Total Paid'}
              </span>
              <span className="text-[#E07A24] font-mono tabular-nums">
                ₹{order.totalAmount}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-6 text-xs text-gray-300 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-2 mb-3">
            Delivery Address
          </h2>
          <p className="font-semibold text-white">{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.addressLine1}</p>
          {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
          <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
          <p className="font-mono text-gray-400">Contact: {order.shippingAddress.phone}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* INVOICE MODAL (On-screen preview of printable invoice) */}
      {/* ------------------------------------------------------------------ */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-[#12151D] border border-[#232938] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-white space-y-6">
            <div className="flex justify-between items-start border-b border-[#232938] pb-4">
              <div>
                <RangrezLogo variant="horizontal" size="md" light={true} />
                <p className="text-[11px] text-[#E07A24] font-serif italic mt-1">"Wear the Colours of Your Story"</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#1A1E29]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Invoice Body */}
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-white">Tax Invoice / Cash Memo</h3>
                  <p className="font-mono text-gray-300 mt-1">Invoice #: INV-{order.orderNumber}</p>
                  <p className="text-gray-400">Date: {orderDate}</p>
                  <p className="text-gray-400">Payment: {order.paymentMethod} ({order.paymentStatus === 'PAID' ? 'Verified Online' : 'Pay at Doorstep'})</p>
                </div>
                <div className="text-right text-gray-400">
                  <p className="font-bold text-white uppercase">RANGREZ ATELIER</p>
                  <p>Surat &bull; Gujarat 395002, India</p>
                  <p className="font-mono text-[11px]">GSTIN: 24AAECR9982Q1ZP</p>
                  <p>care@rangrez.in</p>
                </div>
              </div>

              <div className="bg-[#0B0D12] p-4 rounded-xl border border-[#232938]">
                <h4 className="font-bold uppercase tracking-wider text-gray-400 text-[11px] mb-2">Billed &amp; Shipped To:</h4>
                <p className="font-semibold text-white">{order.shippingAddress.fullName}</p>
                <p className="text-gray-300">{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p className="text-gray-300">{order.shippingAddress.addressLine2}</p>}
                <p className="text-gray-300">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="font-mono text-gray-400 mt-1">Ph: {order.shippingAddress.phone} &middot; {order.shippingAddress.email}</p>
              </div>

              {/* Items Table */}
              <div className="border border-[#232938] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0D12] text-gray-400 font-semibold border-b border-[#232938]">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 font-mono">HSN</th>
                      <th className="py-2.5 px-3 font-mono">Qty</th>
                      <th className="py-2.5 px-3 font-mono text-right">Rate</th>
                      <th className="py-2.5 px-3 font-mono text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C212E] font-mono">
                    {order.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-sans">
                          <p className="font-semibold text-white">{it.productName}</p>
                          <p className="text-[11px] text-gray-400">{it.colorName} &middot; Size {it.size} &middot; 240 GSM</p>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">61091000</td>
                        <td className="py-2.5 px-3 text-white">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-gray-300">₹{it.unitPrice}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">₹{it.totalPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Breakdown */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Taxable Value:</span>
                    <span className="font-mono text-white">₹{taxableSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>GST (5% Apparel):</span>
                    <span className="font-mono text-white">₹{gstAmount}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping:</span>
                    <span className="font-mono text-white">{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</span>
                  </div>
                  {order.codFee > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>COD Fee:</span>
                      <span className="font-mono text-white">₹{order.codFee}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Coupon Discount:</span>
                      <span className="font-mono">-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#232938] flex justify-between font-bold text-sm">
                    <span className="text-white">{isCod ? 'Total Payable:' : 'Total Paid:'}</span>
                    <span className="text-[#E07A24] font-mono">₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#232938] flex justify-between items-end text-[11px] text-gray-500">
                <div>
                  <p className="font-serif italic text-gray-400">Handcrafted Heavyweight Cotton &bull; Pure Artisanal Dyes</p>
                  <p>Computer generated invoice &middot; No physical signature required</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-300">For RANGREZ ATELIER</p>
                  <p className="mt-4 font-mono text-[10px] text-gray-500">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DEDICATED PRINT-ONLY TAX INVOICE (Visible solely on paper print) */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden print-only p-8 bg-white text-gray-900 font-sans max-w-3xl mx-auto">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
          <div>
            <RangrezLogo variant="horizontal" size="lg" light={false} />
            <p className="text-xs text-orange-600 font-serif italic mt-1 font-semibold">
              "Wear the Colours of Your Story"
            </p>
          </div>
          <div className="text-right text-xs">
            <h2 className="text-base font-extrabold uppercase tracking-wider text-gray-900">TAX INVOICE</h2>
            <p className="font-mono font-bold mt-1">Invoice #: INV-{order.orderNumber}</p>
            <p>Date: {orderDate}</p>
            <p className="font-bold">{isCod ? 'Mode: Cash on Delivery (Due)' : 'Mode: Prepaid Online (Paid)'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
          <div className="p-3 border border-gray-300 rounded">
            <p className="font-bold uppercase text-gray-600 text-[10px] mb-1">Sold By:</p>
            <p className="font-bold text-gray-900">RANGREZ ATELIER</p>
            <p>Surat &bull; Gujarat 395002, India</p>
            <p className="font-mono text-[11px] mt-1">GSTIN: 24AAECR9982Q1ZP</p>
            <p>care@rangrez.in</p>
          </div>
          <div className="p-3 border border-gray-300 rounded">
            <p className="font-bold uppercase text-gray-600 text-[10px] mb-1">Billed &amp; Shipped To:</p>
            <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            <p className="font-mono mt-1">Ph: {order.shippingAddress.phone}</p>
          </div>
        </div>

        <table className="w-full text-left text-xs mb-6 border border-gray-300">
          <thead className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[11px]">
            <tr>
              <th className="py-2 px-3">Item Description</th>
              <th className="py-2 px-3 font-mono">HSN</th>
              <th className="py-2 px-3 font-mono">Qty</th>
              <th className="py-2 px-3 font-mono text-right">Unit Rate</th>
              <th className="py-2 px-3 font-mono text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((it, idx) => (
              <tr key={idx}>
                <td className="py-2.5 px-3">
                  <p className="font-bold text-gray-900">{it.productName}</p>
                  <p className="text-[11px] text-gray-600">{it.colorName} &middot; Size {it.size} &middot; 240 GSM Pure Combed Cotton</p>
                </td>
                <td className="py-2.5 px-3 font-mono text-gray-600">61091000</td>
                <td className="py-2.5 px-3 font-mono">{it.quantity}</td>
                <td className="py-2.5 px-3 font-mono text-right">₹{it.unitPrice}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-right">₹{it.totalPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable Value:</span>
              <span className="font-mono">₹{taxableSubtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST (5% Apparel):</span>
              <span className="font-mono">₹{gstAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span className="font-mono">{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</span>
            </div>
            {order.codFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">COD Fee:</span>
                <span className="font-mono">₹{order.codFee}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount ({order.couponCode}):</span>
                <span className="font-mono">-₹{order.discount}</span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-gray-900 flex justify-between font-extrabold text-sm">
              <span>{isCod ? 'Total Payable:' : 'Total Paid:'}</span>
              <span className="font-mono text-orange-600">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-800">Declaration:</p>
            <p className="text-[11px]">We declare that this invoice shows the actual price of the goods described.</p>
            <p className="text-[10px] text-gray-500 mt-1">This is a computer generated invoice and requires no physical signature.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800">For RANGREZ ATELIER</p>
            <div className="h-10"></div>
            <p className="text-[11px] font-semibold border-t border-gray-400 pt-1">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </>
  );
};
