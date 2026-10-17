import React, { useState, useEffect } from 'react';
import { Package, MapPin, Heart, Search, LogOut, ArrowRight, User } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Order, Product, ShippingAddress } from '../types/index.ts';

interface AccountPageProps {
  navigate: (path: string) => void;
  initialTab?: string;
}

export const AccountPage: React.FC<AccountPageProps> = ({ navigate, initialTab }) => {
  const { customer, login, logout, saveAddress, deleteAddress } = useCustomer();
  const { wishlist, addToCart, removeFromCart } = useCart();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>(initialTab || (customer ? 'orders' : 'login'));
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Guest order track state
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackContact, setTrackContact] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Wishlist products
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<ShippingAddress>({
    fullName: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India'
  });

  // Load customer orders
  useEffect(() => {
    if (customer?.email) {
      setLoadingOrders(true);
      fetch(`/api/customer/orders?email=${encodeURIComponent(customer.email)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setOrders(data);
        })
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }
  }, [customer]);

  // Load wishlist products
  useEffect(() => {
    if (wishlist.length > 0) {
      fetch('/api/products')
        .then(res => res.json())
        .then(allProds => {
          if (Array.isArray(allProds)) {
            setWishlistProducts(allProds.filter(p => wishlist.includes(p.id)));
          }
        })
        .catch(() => {});
    } else {
      setWishlistProducts([]);
    }
  }, [wishlist]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const ok = await login(emailInput.trim(), nameInput.trim(), phoneInput.trim());
    if (ok) {
      setActiveTab('orders');
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrderNumber.trim()) return;

    setTrackingLoading(true);
    setTrackError(null);
    setTrackedOrder(null);

    try {
      const res = await fetch(`/api/orders/${trackOrderNumber.trim()}?email=${encodeURIComponent(trackContact.trim())}&phone=${encodeURIComponent(trackContact.trim())}`);
      const data = await res.json();
      if (res.ok && data.id) {
        setTrackedOrder(data);
      } else {
        setTrackError(data.error || 'No order found with this reference number.');
      }
    } catch {
      setTrackError('Error connecting to tracking service');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.addressLine1 || !newAddress.pincode || !newAddress.city) {
      showToast('Please fill all required address fields', 'error');
      return;
    }
    await saveAddress(newAddress);
    setShowAddressForm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 pb-4 border-b border-[#232938]">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand">
          Atelier Account
        </h1>
        <p className="text-xs text-[#9CA3AF] mt-1">
          Access your recent dispatches, track orders, and manage delivery addresses.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8 pb-2 border-b border-[#1C212E]">
        {customer && (
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            My Orders ({orders.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tracking' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Track Any Order
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'wishlist' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          Wishlist ({wishlist.length})
        </button>

        {customer && (
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'addresses' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Addresses
          </button>
        )}

        {!customer && (
          <button
            onClick={() => setActiveTab('login')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'login' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Sign In / Register
          </button>
        )}

        {customer && (
          <button
            onClick={logout}
            className="ml-auto px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        )}
      </div>

      {/* 1. ORDERS TAB */}
      {activeTab === 'orders' && customer && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="text-center py-12 text-xs text-gray-500">Loading order records...</div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-[#12151D] border border-[#232938] rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#232938]">
                    <div>
                      <p className="text-xs font-bold text-white font-serif-brand">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded font-semibold ${
                        order.paymentStatus === 'PAID' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                      <button
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="px-3 py-1 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-medium rounded text-white flex items-center gap-1"
                      >
                        Receipt & Track
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-300">
                        <span>{item.productName} ({item.size}) &times; {item.quantity}</span>
                        <span className="font-mono tabular-nums text-white">₹{item.totalPrice}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#1C212E] flex justify-between text-xs font-bold text-white">
                    <span>{order.paymentMethod === 'COD' ? 'Total Payable (COD)' : 'Total Paid'}</span>
                    <span className="text-[#E07A24] font-mono tabular-nums">₹{order.totalAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#12151D] border border-[#232938] rounded-xl p-12 text-center text-white">
              <h3 className="text-base font-semibold mb-1">No Orders Recorded Yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
                You haven't placed an order with {customer.email} yet.
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
              >
                Browse Heavyweight Tees
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. TRACK ORDER TAB */}
      {activeTab === 'tracking' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Track Real-Time Dispatch
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4">
              Enter your Order Number (e.g. RZ-1001) and associated phone/email to check real fulfillment status.
            </p>

            <form onSubmit={handleTrackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Order Number *</label>
                <input
                  type="text"
                  required
                  value={trackOrderNumber}
                  onChange={e => setTrackOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. RZ492810"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Phone or Email (Optional Verification)</label>
                <input
                  type="text"
                  value={trackContact}
                  onChange={e => setTrackContact(e.target.value)}
                  placeholder="Used during checkout"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {trackingLoading ? 'Checking Records...' : 'Track Dispatch'}
              </button>
            </form>
          </div>

          {trackError && (
            <div className="p-4 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-200 text-center">
              {trackError}
            </div>
          )}

          {trackedOrder && (
            <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4 text-white">
              <div className="flex justify-between items-center pb-3 border-b border-[#232938]">
                <span className="font-serif-brand font-bold">Order #{trackedOrder.orderNumber}</span>
                <span className="text-xs text-emerald-400 font-semibold">{trackedOrder.fulfillmentStatus}</span>
              </div>
              <div className="text-xs space-y-1.5 text-gray-300">
                <p><strong>Payment Mode:</strong> {trackedOrder.paymentMethod} ({trackedOrder.paymentStatus})</p>
                <p><strong>Destination:</strong> {trackedOrder.shippingAddress.city}, {trackedOrder.shippingAddress.pincode}</p>
                {trackedOrder.qikinkAwb && <p><strong>AWB Number:</strong> {trackedOrder.qikinkAwb}</p>}
              </div>
              <button
                onClick={() => navigate(`/order/${trackedOrder.id}`)}
                className="w-full py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white"
              >
                View Full Receipt
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlistProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistProducts.map(prod => (
                <div key={prod.id} className="bg-[#12151D] border border-[#232938] rounded-xl overflow-hidden p-4 flex flex-col justify-between">
                  <div className="aspect-4/5 bg-[#171B26] rounded-lg overflow-hidden mb-3">
                    {prod.images[0] && (
                      <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white truncate">{prod.name}</h4>
                    <p className="text-xs text-gray-400 font-mono mt-1">₹{prod.price}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => navigate(`/product/${prod.slug || prod.id}`)}
                      className="flex-1 py-1.5 bg-[#E07A24] text-white text-xs font-semibold rounded-lg"
                    >
                      View & Select Size
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#12151D] border border-[#232938] rounded-xl p-12 text-center text-white">
              <h3 className="text-base font-semibold mb-1">Your Wishlist is Empty</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
                Save your favorite botanical prints to access them anytime.
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
              >
                Explore Collection
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. ADDRESSES TAB */}
      {activeTab === 'addresses' && customer && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Saved Shipping Addresses</h3>
            <button
              onClick={() => setShowAddressForm(prev => !prev)}
              className="px-3 py-1.5 bg-[#E07A24] text-white text-xs font-semibold rounded-lg"
            >
              {showAddressForm ? 'Cancel' : '+ Add Address'}
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleAddAddress} className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">New Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newAddress.fullName}
                  onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  className="bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                />
                <input
                  type="tel"
                  required
                  placeholder="10-digit Phone"
                  value={newAddress.phone}
                  onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Address Line 1"
                  value={newAddress.addressLine1}
                  onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                  className="sm:col-span-2 bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Landmark"
                  value={newAddress.landmark || ''}
                  onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })}
                  className="sm:col-span-2 bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={newAddress.city}
                  onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={newAddress.pincode}
                  onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  className="bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#E07A24] text-white text-xs font-semibold rounded-lg mt-2"
              >
                Save Delivery Address
              </button>
            </form>
          )}

          <div className="space-y-3">
            {customer.savedAddresses && customer.savedAddresses.length > 0 ? (
              customer.savedAddresses.map((addr, idx) => (
                <div key={idx} className="bg-[#12151D] border border-[#232938] rounded-xl p-4 flex justify-between items-start text-xs text-gray-300">
                  <div>
                    <p className="font-semibold text-white">{addr.fullName}</p>
                    <p>{addr.addressLine1}</p>
                    <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="font-mono text-gray-400 mt-1">Phone: {addr.phone}</p>
                  </div>
                  <button
                    onClick={() => deleteAddress(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-6">No saved addresses yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 5. LOGIN TAB */}
      {activeTab === 'login' && !customer && (
        <div className="max-w-md mx-auto bg-[#12151D] border border-[#232938] rounded-xl p-8 text-white space-y-6">
          <div>
            <h3 className="text-lg font-bold font-serif-brand">Atelier Customer Sign In</h3>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Enter your email to view your previous orders and save checkout addresses.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Full Name (Optional)</label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="e.g. Priyansh Roy"
                className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E07A24]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Enter Atelier Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
