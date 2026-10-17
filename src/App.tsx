import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext.tsx';
import { CustomerProvider } from './context/CustomerContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { BrandProvider } from './context/BrandContext.tsx';

import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { CookieBanner } from './components/CookieBanner.tsx';
import { Preloader } from './components/Preloader.tsx';

import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderSuccessPage } from './pages/OrderSuccessPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { FAQPage } from './pages/FAQPage.tsx';
import { ShippingPage } from './pages/ShippingPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    return new URLSearchParams(window.location.search);
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    const [pathPart, queryPart] = to.split('?');
    window.history.pushState({}, '', to);
    setCurrentPath(pathPart || '/');
    setSearchParams(new URLSearchParams(queryPart || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Resolver
  const renderContent = () => {
    if (currentPath === '/' || currentPath === '') {
      return <HomePage navigate={navigate} />;
    }

    if (currentPath === '/shop') {
      const fit = searchParams.get('fit') || undefined;
      return <ShopPage navigate={navigate} initialFit={fit} />;
    }

    if (currentPath.startsWith('/product/')) {
      const slug = currentPath.replace('/product/', '');
      return <ProductDetailPage idOrSlug={slug} navigate={navigate} />;
    }

    if (currentPath === '/checkout') {
      return <CheckoutPage navigate={navigate} />;
    }

    if (currentPath.startsWith('/order/')) {
      const orderId = currentPath.replace('/order/', '');
      return <OrderSuccessPage orderId={orderId} navigate={navigate} />;
    }

    if (currentPath === '/account') {
      const tab = searchParams.get('tab') || undefined;
      return <AccountPage navigate={navigate} initialTab={tab} />;
    }

    if (currentPath === '/about') {
      return <AboutPage navigate={navigate} />;
    }

    if (currentPath === '/contact') {
      return <ContactPage />;
    }

    if (currentPath === '/faq') {
      return <FAQPage />;
    }

    if (currentPath === '/shipping-returns') {
      return <ShippingPage />;
    }

    if (currentPath === '/privacy') {
      return <PrivacyPage />;
    }

    if (currentPath === '/terms') {
      return <TermsPage />;
    }

    if (currentPath === '/admin') {
      return <AdminPage />;
    }

    return <NotFoundPage navigate={navigate} />;
  };

  return (
    <ToastProvider>
      <CustomerProvider>
        <CartProvider>
          <BrandProvider>
            <Preloader />
            <div className="min-h-screen bg-[#0B0D12] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#E07A24] selection:text-white">
              
              {/* Top Navigation */}
              <Navbar
                currentPath={currentPath}
                navigate={navigate}
                onOpenSearch={() => setSearchModalOpen(true)}
              />

              {/* Main Page Content */}
              <main className="flex-1">
                {renderContent()}
              </main>

              {/* Footer */}
              <Footer navigate={navigate} />

              {/* Global Drawers & Modals */}
              <CartDrawer navigate={navigate} />
              <SearchModal
                isOpen={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
                navigate={navigate}
              />
              <CookieBanner />
            </div>
          </BrandProvider>
        </CartProvider>
      </CustomerProvider>
    </ToastProvider>
  );
}
