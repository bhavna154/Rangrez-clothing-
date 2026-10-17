import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useBrand } from '../context/BrandContext.tsx';
import { RangrezLogo } from './RangrezLogo.tsx';

interface CartDrawerProps {
  navigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ navigate }) => {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    subtotal
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const { showToast } = useToast();
  const { brandSettings } = useBrand();

  if (!isCartDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({ code: data.code, discount: data.discount });
        showToast(`Coupon ${data.code} applied: ₹${data.discount} off!`, 'success');
      } else {
        showToast(data.error || 'Invalid coupon code', 'error');
        setAppliedCoupon(null);
      }
    } catch {
      showToast('Error validating coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const shippingFee = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0E1118] border-l border-[#232938] text-white flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="p-5 border-b border-[#232938] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-serif-brand tracking-wide">Your Bag</span>
              <span className="text-xs text-[#9CA3AF] tabular-nums">({cart.length} unique designs)</span>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 text-[#9CA3AF] hover:text-white rounded-md hover:bg-[#1A1E29] transition-colors cursor-pointer"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#1A1E29] flex items-center justify-center text-[#6B7280] mb-4">
                  <Tag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Your bag is empty</h3>
                <p className="text-xs text-[#9CA3AF] max-w-xs mb-6">
                  Explore our limited runs of artisanal 240 GSM tees and add your preferred size.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/shop');
                  }}
                  className="px-6 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              <>
                {/* Free shipping progress indicator: ONLY if configured by admin */}
                {brandSettings.freeShippingThreshold && brandSettings.freeShippingThreshold > 0 ? (
                  <div className="bg-[#12151D] border border-[#232938] p-3 rounded-lg text-xs">
                    {subtotal >= brandSettings.freeShippingThreshold ? (
                      <p className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        {brandSettings.shippingOfferText || 'Complimentary delivery unlocked!'}
                      </p>
                    ) : (
                      <div>
                        <p className="text-[#D1D5DB] mb-1.5">
                          Add <span className="text-[#E07A24] font-semibold tabular-nums">₹{brandSettings.freeShippingThreshold - subtotal}</span> more for {brandSettings.shippingOfferText ? brandSettings.shippingOfferText.toLowerCase() : 'free shipping'}
                        </p>
                        <div className="w-full bg-[#1A1E29] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#E07A24] h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (subtotal / brandSettings.freeShippingThreshold) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : brandSettings.shippingOfferText?.trim() ? (
                  <div className="bg-[#12151D] border border-[#232938] p-2.5 rounded-lg text-xs text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{brandSettings.shippingOfferText}</span>
                  </div>
                ) : null}

                {/* Items List */}
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.productId}-${item.colorName}-${item.size}-${idx}`}
                      className="p-3 bg-[#12151D] border border-[#232938] rounded-lg flex gap-3 items-start"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-18 h-22 bg-[#1A1E29] rounded-md overflow-hidden shrink-0 border border-[#2B3245] flex items-center justify-center">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1">
                            <RangrezLogo variant="icon" size="sm" light={true} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white truncate">
                            {item.productName}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.productId, item.colorName, item.size)}
                            className="text-[#6B7280] hover:text-[#8E2834] transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Variant details */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9CA3AF]">
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-gray-600 inline-block"
                              style={{ backgroundColor: item.colorHex || '#111' }}
                            />
                            {item.colorName}
                          </span>
                          <span>&middot;</span>
                          <span className="font-mono text-gray-300">Size: {item.size}</span>
                        </div>

                        {/* Price & Quantity stepper */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1C212E]">
                          <span className="text-xs font-semibold text-white tabular-nums">
                            ₹{item.totalPrice}
                          </span>

                          <div className="flex items-center border border-[#2B3245] rounded-md bg-[#1A1E29]">
                            <button
                              onClick={() => updateQuantity(item.productId, item.colorName, item.size, item.quantity - 1)}
                              className="p-1 hover:text-[#E07A24] text-gray-400"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-mono tabular-nums text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.colorName, item.size, item.quantity + 1)}
                              className="p-1 hover:text-[#E07A24] text-gray-400"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Input */}
                <form onSubmit={handleApplyCoupon} className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon Code"
                      className="flex-1 bg-[#12151D] border border-[#232938] rounded-md px-3 py-1.5 text-xs text-white uppercase placeholder-gray-500 focus:outline-none focus:border-[#E07A24]"
                    />
                    <button
                      type="submit"
                      disabled={validatingCoupon}
                      className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-medium rounded-md text-gray-200 transition-colors cursor-pointer"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center justify-between">
                      <span>Applied: {appliedCoupon.code} (-₹{appliedCoupon.discount})</span>
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </p>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#232938] bg-[#0B0D12] space-y-3">
              <div className="space-y-1.5 text-xs text-[#9CA3AF]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white tabular-nums">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span className="text-white tabular-nums">
                    {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="tabular-nums">-₹{appliedCoupon.discount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#232938] flex justify-between text-sm font-bold text-white">
                  <span>Estimated Total</span>
                  <span className="tabular-nums text-[#E07A24]">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-orange-950/20"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-center text-[#6B7280]">
                Taxes included &middot; {brandSettings.pincodeCoverageText?.trim() || 'Cash on Delivery Available'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
