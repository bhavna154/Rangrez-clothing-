import React, { useState, useEffect } from 'react';
import { ShieldCheck, Truck, ArrowLeft, CheckCircle2, AlertTriangle, CreditCard, Banknote } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useCustomer } from '../context/CustomerContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { ShippingAddress, PaymentMethod } from '../types/index.ts';

interface CheckoutPageProps {
  navigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ navigate }) => {
  const { cart, subtotal, clearCart } = useCart();
  const { customer, saveAddress } = useCustomer();
  const { showToast } = useToast();

  // Payment configuration from server
  const [paymentConfig, setPaymentConfig] = useState<{
    razorpayKeyId: string | null;
    phonepeEnabled: boolean;
  }>({ razorpayKeyId: null, phonepeEnabled: false });

  // Address form
  const [formData, setFormData] = useState<ShippingAddress>({
    fullName: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    addressLine1: customer?.savedAddresses?.[0]?.addressLine1 || '',
    addressLine2: customer?.savedAddresses?.[0]?.addressLine2 || '',
    landmark: customer?.savedAddresses?.[0]?.landmark || '',
    city: customer?.savedAddresses?.[0]?.city || '',
    state: customer?.savedAddresses?.[0]?.state || 'Maharashtra',
    pincode: customer?.savedAddresses?.[0]?.pincode || '',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [nonAsciiWarning, setNonAsciiWarning] = useState(false);

  useEffect(() => {
    fetch('/api/payments/config')
      .then(res => res.json())
      .then(data => {
        setPaymentConfig(data);
        // Default to razorpay or phonepe if available, else COD
        if (data.razorpayKeyId) setPaymentMethod('RAZORPAY');
        else if (data.phonepeEnabled) setPaymentMethod('PHONEPE');
        else setPaymentMethod('COD');
      })
      .catch(() => {});
  }, []);

  // Check ASCII purity on address input
  useEffect(() => {
    const combined = `${formData.fullName} ${formData.addressLine1} ${formData.addressLine2 || ''} ${formData.city}`;
    const hasNonAscii = /[^\x20-\x7E]/.test(combined);
    setNonAsciiWarning(hasNonAscii);
  }, [formData]);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center text-white">
        <h2 className="text-2xl font-bold font-serif-brand mb-2">Your Bag is Empty</h2>
        <p className="text-sm text-gray-400 mb-6">Select a silhouette from our collection before checking out.</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  const shippingFee = subtotal >= 1499 ? 0 : 99;
  const codFee = paymentMethod === 'COD' ? 60 : 0;
  const totalPayable = Math.max(0, subtotal + shippingFee + codFee - discount);

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh'
  ];

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setDiscount(data.discount);
        showToast(`Coupon applied! Saved ₹${data.discount}`, 'success');
      } else {
        showToast(data.error || 'Invalid coupon', 'error');
        setDiscount(0);
      }
    } catch {
      showToast('Error validating coupon', 'error');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.addressLine1.trim()) {
      showToast('Please complete all required shipping fields', 'error');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      showToast('Please enter a valid 6-digit PIN code', 'error');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create order on server
      const orderPayload = {
        items: cart,
        shippingAddress: {
          ...formData,
          phone: cleanPhone.slice(-10)
        },
        paymentMethod,
        couponCode: discount > 0 ? couponCode : undefined
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to initialize order');
      }

      // Save address if customer is logged in
      if (customer) {
        saveAddress(formData);
      }

      // Store private order access token for receipt viewing
      if (orderData.orderAccessToken) {
        try {
          sessionStorage.setItem(`rangrez_order_token_${orderData.id}`, orderData.orderAccessToken);
          sessionStorage.setItem(`rangrez_order_token_${orderData.orderNumber}`, orderData.orderAccessToken);
        } catch {}
      }

      const orderUrl = orderData.orderAccessToken
        ? `/order/${orderData.id}?token=${encodeURIComponent(orderData.orderAccessToken)}`
        : `/order/${orderData.id}`;

      // 2. Handle payment method flow
      if (paymentMethod === 'COD') {
        clearCart();
        showToast(`Order #${orderData.orderNumber} placed successfully!`, 'success');
        navigate(orderUrl);
        return;
      }

      if (paymentMethod === 'RAZORPAY') {
        // Create Razorpay order on server
        const rzpOrderRes = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id })
        });
        const rzpData = await rzpOrderRes.json();

        if (!rzpOrderRes.ok) {
          throw new Error(rzpData.error || 'Razorpay order creation failed');
        }

        // Open Razorpay Standard Checkout
        // We load Razorpay checkout script if not present
        if (!(window as any).Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          document.body.appendChild(script);
          await new Promise(resolve => { script.onload = resolve; });
        }

        const options = {
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency,
          name: 'RANGREZ',
          description: `Order ${orderData.orderNumber}`,
          order_id: rzpData.razorpayOrderId,
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: cleanPhone.slice(-10)
          },
          theme: {
            color: '#E07A24'
          },
          handler: async (response: any) => {
            // Verify payment on server
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: orderData.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              clearCart();
              showToast('Payment confirmed! Order placed.', 'success');
              navigate(`/order/${orderData.id}`);
            } else {
              showToast(verifyData.error || 'Payment verification failed', 'error');
            }
          },
          modal: {
            ondismiss: () => {
              showToast('Payment window closed. You can retry anytime.', 'info');
              navigate(`/order/${orderData.id}`);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      if (paymentMethod === 'PHONEPE') {
        const phonepeRes = await fetch('/api/payments/phonepe/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.id,
            callbackUrl: window.location.origin + '/order/' + orderData.id
          })
        });
        const ppData = await phonepeRes.json();
        if (phonepeRes.ok && ppData.redirectUrl) {
          clearCart();
          // Navigate to PhonePe gateway
          window.location.href = ppData.redirectUrl;
          return;
        } else {
          throw new Error(ppData.error || 'PhonePe initialization rejected');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error completing checkout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate('/shop')}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Shopping
      </button>

      <div className="mb-8 pb-4 border-b border-[#232938]">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand">
          Checkout & Dispatch
        </h1>
        <p className="text-xs text-[#9CA3AF] mt-1">
          Review your delivery details and choose your preferred payment method.
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Delivery & Payment Options (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Shipping Address */}
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E07A24]" />
                1. Shipping Address
              </h2>
              <span className="text-[11px] text-gray-500 font-mono">India Only</span>
            </div>

            {nonAsciiWarning && (
              <div className="p-3 bg-[#1A1A12] border border-amber-900/50 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E07A24] shrink-0 mt-0.5" />
                <p>
                  <strong>Character notice:</strong> For seamless courier & Qikink fulfillment, address text will be formatted in clean standard English characters.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="10-digit number (e.g. 9876543210)"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="For tracking updates & receipt"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Address Line 1 (Flat, House no., Building) *</label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Building name, street address"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Address Line 2 / Landmark (Optional)</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Nearby landmark, locality"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Postal PIN Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.pincode}
                  onChange={e => setFormData({ ...formData, pincode: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="6-digit PIN"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">State *</label>
                <select
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                >
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#E07A24]" />
                2. Payment Method
              </h2>
              <span className="text-[11px] text-gray-500">Encrypted & Secure</span>
            </div>

            <div className="space-y-3">
              {/* Cash on Delivery (COD) - Always Available */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === 'COD'
                    ? 'border-[#E07A24] bg-[#1A1A12]'
                    : 'border-[#232938] bg-[#0B0D12] hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 accent-[#E07A24]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-xs font-mono text-gray-300">+₹60 COD fee</span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">
                    Pay in cash or UPI directly to the courier upon doorstep delivery.
                  </p>
                </div>
              </label>

              {/* Razorpay (Only shown if key configured) */}
              {paymentConfig.razorpayKeyId && (
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-[#E07A24] bg-[#12151D]'
                      : 'border-[#232938] bg-[#0B0D12] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="RAZORPAY"
                    checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')}
                    className="mt-1 accent-[#E07A24]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Razorpay (UPI, Google Pay, Cards, Netbanking)
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">Zero COD Fee</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      Fast, instant checkout with UPI QR, credit cards, or netbanking.
                    </p>
                  </div>
                </label>
              )}

              {/* PhonePe (Only shown if configured) */}
              {paymentConfig.phonepeEnabled && (
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'PHONEPE'
                      ? 'border-[#E07A24] bg-[#12151D]'
                      : 'border-[#232938] bg-[#0B0D12] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PHONEPE"
                    checked={paymentMethod === 'PHONEPE'}
                    onChange={() => setPaymentMethod('PHONEPE')}
                    className="mt-1 accent-[#E07A24]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        PhonePe Payment Gateway
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">Zero COD Fee</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      Pay directly via PhonePe UPI, debit card, or wallet.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
              Order Summary ({cart.length} items)
            </h3>

            {/* Item list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className="w-12 h-14 bg-[#1A1E29] rounded border border-[#2B3245] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-500 font-serif">RZ</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{item.productName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {item.size} &middot; {item.colorName} &times; {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono text-white tabular-nums">
                    ₹{item.totalPrice}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon input */}
            <div className="pt-3 border-t border-[#1C212E]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-[#E07A24]"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 pt-3 border-t border-[#1C212E] text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white font-mono tabular-nums">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-white font-mono">
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              {paymentMethod === 'COD' && (
                <div className="flex justify-between text-gray-300">
                  <span>Cash on Delivery Handling Fee</span>
                  <span className="text-white font-mono tabular-nums">₹{codFee}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">-₹{discount}</span>
                </div>
              )}

              {/* Grand Total / Total Payable */}
              <div className="pt-3 border-t border-[#232938] flex justify-between text-base font-bold">
                <span className="text-white">
                  {paymentMethod === 'COD' ? 'Total Payable (Doorstep)' : 'Total Payable'}
                </span>
                <span className="text-[#E07A24] font-mono tabular-nums">
                  ₹{totalPayable}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-orange-950/20"
            >
              {submitting ? 'Processing Dispatch...' : paymentMethod === 'COD' ? 'Confirm COD Order' : 'Proceed to Payment'}
            </button>

            <div className="pt-2 text-[11px] text-center text-gray-500 space-y-1">
              <p className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                100% Genuine 240 GSM Combed Cotton Guaranteed
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
