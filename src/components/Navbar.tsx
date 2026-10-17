import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, User, Menu, X, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useCustomer } from '../context/CustomerContext.tsx';
import { RangrezLogo } from './RangrezLogo.tsx';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate, onOpenSearch }) => {
  const { itemCount, setIsCartDrawerOpen, wishlist } = useCart();
  const { customer } = useCustomer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Shop', path: '/shop' },
    { label: 'Men', path: '/shop?gender=men' },
    { label: 'Women', path: '/shop?gender=women' },
    { label: 'Heritage', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Editorial Announcement Bar */}
      <aside aria-label="Announcement" className="bg-[#12151D] border-b border-[#232938] text-xs text-[#9CA3AF] py-2 px-4 text-center tracking-wide">
        <p className="max-w-7xl mx-auto truncate">
          Complimentary shipping across India above ₹1,499 &middot; Heavyweight 240 GSM Combed Cotton &middot; Zero Plastic Packaging
        </p>
      </aside>

      {/* Main Header - Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#0B0D12]/95 backdrop-blur-md border-b border-[#232938] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6 sm:gap-8">
          
          {/* Zone 1: Brand Logo (R Icon + Wordmark) */}
          <button
            onClick={() => handleNav('/')}
            className="flex items-center text-left whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer py-1"
            aria-label="RANGREZ Home"
          >
            <RangrezLogo variant="horizontal" size="md" light={true} />
          </button>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#D1D5DB]">
            {navLinks.map(link => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.label}
                  onClick={() => handleNav(link.path)}
                  className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer pb-1 border-b-2 ${
                    isActive ? 'border-[#E07A24] text-white' : 'border-transparent text-[#9CA3AF]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Utilities */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              className="p-2 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer rounded-md hover:bg-[#1A1E29]"
              aria-label="Search collection"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist */}
            <button
              onClick={() => handleNav('/account?tab=wishlist')}
              className="relative p-2 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer rounded-md hover:bg-[#1A1E29]"
              aria-label="Saved items"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#8E2834] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Account */}
            <button
              onClick={() => handleNav('/account')}
              className="p-2 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer rounded-md hover:bg-[#1A1E29] flex items-center gap-1.5"
              aria-label="My Account"
            >
              <User className="w-5 h-5" />
              {customer && (
                <span className="hidden xl:inline text-xs text-[#E5E7EB] max-w-[80px] truncate">
                  {customer.name.split(' ')[0]}
                </span>
              )}
            </button>

            {/* Cart Bag */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-white rounded-lg transition-colors cursor-pointer"
              aria-label={`Shopping bag with ${itemCount} items`}
            >
              <ShoppingBag className="w-4 h-4 text-[#E07A24]" />
              <span className="text-xs font-semibold tabular-nums">
                {itemCount}
              </span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-[#9CA3AF] hover:text-white rounded-md hover:bg-[#1A1E29] cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-4/5 max-w-sm h-full bg-[#0B0D12] border-r border-[#232938] p-6 flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#232938]">
                <RangrezLogo variant="horizontal" size="sm" light={true} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#9CA3AF] hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-4 mt-6">
                {navLinks.map(link => (
                  <button
                    key={link.label}
                    onClick={() => handleNav(link.path)}
                    className="text-left text-lg font-medium text-[#D1D5DB] hover:text-[#E07A24] py-2 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => handleNav('/faq')}
                  className="text-left text-sm text-[#9CA3AF] hover:text-white py-1 transition-colors cursor-pointer"
                >
                  FAQ & Care
                </button>
                <button
                  onClick={() => handleNav('/shipping-returns')}
                  className="text-left text-sm text-[#9CA3AF] hover:text-white py-1 transition-colors cursor-pointer"
                >
                  Shipping & Returns
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-[#232938] flex flex-col gap-3">
              <button
                onClick={() => handleNav('/account')}
                className="w-full py-2.5 px-4 bg-[#1A1E29] hover:bg-[#232938] text-white text-sm font-medium rounded-lg text-center"
              >
                {customer ? `Atelier Account (${customer.name})` : 'Sign In / Register'}
              </button>
              <button
                onClick={() => handleNav('/admin')}
                className="w-full py-2 px-3 bg-[#161B26] hover:bg-[#1E2536] border border-[#2B3245] rounded-lg text-xs font-bold uppercase tracking-wider text-[#E07A24] hover:text-[#F59E0B] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
