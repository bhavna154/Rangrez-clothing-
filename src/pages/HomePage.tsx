import React, { useEffect, useState } from 'react';
import {
  ArrowRight, ShieldCheck, Sparkles, Feather, Layers, Truck, RotateCcw,
  CheckCircle2, Bell, Heart, ExternalLink
} from 'lucide-react';
import type { Product } from '../types/index.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { useBrand } from '../context/BrandContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { RangrezIcon } from '../components/RangrezLogo.tsx';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { brandSettings } = useBrand();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [submittingNotify, setSubmittingNotify] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSubmittingNotify(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('You are on the VIP guestlist. We will notify you for Drop 01!', 'success');
        setNotifyEmail('');
      } else {
        showToast(data.error || 'Failed to submit notification request', 'error');
      }
    } catch {
      showToast('Network error, please try again', 'error');
    } finally {
      setSubmittingNotify(false);
    }
  };

  const heroHeading = brandSettings.heroHeading || 'WEAR THE COLOURS OF YOUR STORY';
  const heroSubline = brandSettings.heroSubline || 'Premium printed oversized tees';

  const heroManImage = brandSettings.heroManImage || '/src/assets/images/hero_male_tee_1791638393383.jpg';
  const heroWomanImage = brandSettings.heroWomanImage || '/src/assets/images/hero_female_tee_1791638403875.jpg';

  const tileHimImage = brandSettings.tileHimImage || heroManImage;
  const tileHerImage = brandSettings.tileHerImage || heroWomanImage;

  const lookbookImages = brandSettings.lookbookImages && brandSettings.lookbookImages.length > 0
    ? brandSettings.lookbookImages
    : [
        '/src/assets/images/lookbook_indigo_dye_1791638414373.jpg',
        '/src/assets/images/lookbook_urban_street_1791638440171.jpg',
        heroManImage,
        heroWomanImage
      ];

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. HERO SECTION: FULL-WIDTH SPLIT BANNER */}
      <section className="relative w-full min-h-[85vh] lg:min-h-[90vh] bg-[#07090D] overflow-hidden flex flex-col justify-end">
        {/* Split Background Images */}
        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
          {/* Man photo block (Left) with elegant saffron & indigo gradient fallback */}
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#0B0D12] via-[#121826] to-[#254587]/40 flex items-center justify-center">
            {heroManImage ? (
              <img
                src={heroManImage}
                alt="Rangrez Men Lookbook"
                className="w-full h-full object-cover object-top opacity-70 md:opacity-80 transition-transform duration-1000 hover:scale-105"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            {/* Elegant atmospheric gradient placeholder motif in indigo/saffron */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <RangrezIcon className="w-64 h-64 text-[#254587]/15" dropColor="#E07A24" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0B0D12]/70 hidden md:block" />
          </div>

          {/* Woman photo block (Right) with elegant saffron & madder gradient fallback */}
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-bl from-[#0B0D12] via-[#1F1218] to-[#8E2834]/40 flex items-center justify-center">
            {heroWomanImage ? (
              <img
                src={heroWomanImage}
                alt="Rangrez Women Lookbook"
                className="w-full h-full object-cover object-top opacity-70 md:opacity-80 transition-transform duration-1000 hover:scale-105"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            {/* Elegant atmospheric gradient placeholder motif in madder/saffron */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <RangrezIcon className="w-64 h-64 text-[#8E2834]/15" dropColor="#E07A24" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0B0D12]/70 hidden md:block" />
          </div>
        </div>

        {/* Cinematic Scrim overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_60%,rgba(11,13,18,0.7),rgba(11,13,18,0.95))]" />

        {/* Center Typography & Primary CTA */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-16 z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#E07A24] font-semibold mb-4">
            Artisanal Homegrown Heavyweight House
          </p>

          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-5 font-serif-brand drop-shadow-lg">
            {heroHeading}
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-[#E5E7EB] font-light tracking-wide mb-9 drop-shadow">
            {heroSubline} &middot; 240 GSM Pure Combed Cotton &middot; Zero Plastic Packaging
          </p>

          {/* Primary Split Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => navigate('/shop?gender=men')}
              className="w-full sm:w-1/2 py-3.5 px-6 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xl shadow-orange-950/40 hover:scale-[1.02]"
            >
              Shop Men
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/shop?gender=women')}
              className="w-full sm:w-1/2 py-3.5 px-6 bg-[#12151D]/90 hover:bg-[#1A1E29] border border-[#3B445A] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer hover:border-[#E07A24] backdrop-blur-md"
            >
              Shop Women
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. STRIP OF 4 TRUST ICONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#E07A24]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Premium 240 GSM Cotton
              </h3>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Compact ringspun & zero see-through
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Cash on Delivery
              </h3>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                {brandSettings.pincodeCoverageText?.trim() || 'Pay with cash or UPI on delivery'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Easy Returns
              </h3>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                7-day hassle-free size exchange
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center shrink-0">
              <Feather className="w-5 h-5 text-[#8E2834]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Made in India
              </h3>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Artisanal dyeing & ethical craft
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TWO LARGE TILES: "FOR HIM" AND "FOR HER" */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Him Card */}
          <div
            onClick={() => navigate('/shop?gender=men')}
            className="group relative aspect-4/5 rounded-2xl overflow-hidden border border-[#232938] hover:border-[#E07A24] transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-end p-8 bg-gradient-to-br from-[#12151D] via-[#151D2A] to-[#254587]/30"
          >
            {tileHimImage ? (
              <img
                src={tileHimImage}
                alt="For Him Collection"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <RangrezIcon className="w-48 h-48 text-[#254587]/15" dropColor="#E07A24" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/40 to-transparent" />

            <div className="relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest text-[#E07A24] font-semibold">
                Curated Silhouette
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand mt-1 mb-2">
                For Him
              </h2>
              <p className="text-xs text-[#D1D5DB] max-w-sm mb-4">
                Heavyweight oversized cuts with dropped shoulders and structured drape.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white group-hover:text-[#E07A24] uppercase tracking-wider transition-colors">
                Explore Men's Drop
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>

          {/* For Her Card */}
          <div
            onClick={() => navigate('/shop?gender=women')}
            className="group relative aspect-4/5 rounded-2xl overflow-hidden border border-[#232938] hover:border-[#8E2834] transition-all duration-300 cursor-pointer shadow-xl flex flex-col justify-end p-8 bg-gradient-to-bl from-[#12151D] via-[#24141A] to-[#8E2834]/30"
          >
            {tileHerImage ? (
              <img
                src={tileHerImage}
                alt="For Her Collection"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <RangrezIcon className="w-48 h-48 text-[#8E2834]/15" dropColor="#E07A24" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/40 to-transparent" />

            <div className="relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-semibold">
                Curated Silhouette
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand mt-1 mb-2">
                For Her
              </h2>
              <p className="text-xs text-[#D1D5DB] max-w-sm mb-4">
                Relaxed architectural streetwear silhouettes in madder and raw bone tones.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white group-hover:text-rose-400 uppercase tracking-wider transition-colors">
                Explore Women's Drop
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORY TILES: Oversized, Regular Fit, Graphic Tees, Acid-Wash */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center max-w-lg mx-auto">
          <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold mb-1">
            Signatures
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-brand">
            Shop By Silhouette
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 1. Oversized */}
          <div
            onClick={() => navigate('/shop?fit=Oversized')}
            className="group bg-[#12151D] border border-[#232938] hover:border-[#E07A24] rounded-xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1"
          >
            <div>
              <span className="text-[11px] font-mono text-[#E07A24] uppercase tracking-wider">Cut 01</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-brand mt-1 mb-2">
                Oversized
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                240 GSM heavyweight drape with 1.25" Lycra ribbed collar and dropped shoulder seam.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#E07A24]">
              View Silhouette <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Regular Fit */}
          <div
            onClick={() => navigate('/shop?fit=Regular%20Boxy')}
            className="group bg-[#12151D] border border-[#232938] hover:border-indigo-400 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1"
          >
            <div>
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">Cut 02</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-brand mt-1 mb-2">
                Regular Fit
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Refined boxy crewneck cut falling straight from the chest for an effortless drape.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-indigo-400">
              View Silhouette <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Graphic Tees */}
          <div
            onClick={() => navigate('/shop?category=graphic')}
            className="group bg-[#12151D] border border-[#232938] hover:border-[#8E2834] rounded-xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1"
          >
            <div>
              <span className="text-[11px] font-mono text-[#8E2834] uppercase tracking-wider">Artwork 01</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-brand mt-1 mb-2">
                Graphic Tees
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Original in-house prints inspired by Indian folklore, calligraphy, and botanical dyes.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-[#8E2834]">
              View Graphics <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Acid-Wash */}
          <div
            onClick={() => navigate('/shop?category=acid-wash')}
            className="group bg-[#12151D] border border-[#232938] hover:border-amber-400 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1"
          >
            <div>
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Wash 02</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-brand mt-1 mb-2">
                Acid-Wash
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Vintage enzyme and discharge wash treatments providing a soft, lived-in patina.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-400">
              View Washes <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS & BEST SELLERS (Never empty) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* New Arrivals Block */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#232938]">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold mb-1">
                Fresh From The Dye-Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-brand">
                New Arrivals
              </h2>
            </div>
            {products.length > 0 && (
              <button
                onClick={() => navigate('/shop')}
                className="text-xs font-semibold uppercase tracking-wider text-[#D1D5DB] hover:text-[#E07A24] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                View Full Line <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-[#12151D] border border-[#232938] rounded-xl aspect-4/5 animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 4).map(prod => (
                <ProductCard key={prod.id} product={prod} navigate={navigate} />
              ))}
            </div>
          ) : (
            /* First drop coming soon block (Never looks empty, strictly real data) */
            <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto relative overflow-hidden shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center mx-auto mb-4 text-[#E07A24]">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#E07A24] font-semibold">
                Drop 01 In Production
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-serif-brand text-white mt-1 mb-2">
                First Drop Coming Soon
              </h3>
              <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mx-auto mb-6 leading-relaxed">
                Our master dyers are finishing the inaugural run of 240 GSM botanical tees. Enter your email to receive private first-access invitations before public release.
              </p>
              <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E07A24]"
                />
                <button
                  type="submit"
                  disabled={submittingNotify}
                  className="px-6 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingNotify ? 'Saving...' : 'Notify Me'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Best Sellers Block */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#232938]">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-1">
                Atelier Favorites
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-brand">
                Best Sellers
              </h2>
            </div>
          </div>

          {products.length > 4 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(4, 8).map(prod => (
                <ProductCard key={prod.id} product={prod} navigate={navigate} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, Math.min(4, products.length)).map(prod => (
                <ProductCard key={prod.id} product={prod} navigate={navigate} />
              ))}
            </div>
          ) : (
            /* First drop coming soon block (Never looks empty) */
            <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-[#1A1E29] border border-[#2B3245] flex items-center justify-center mx-auto mb-4 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                Limited Batch Releases
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-serif-brand text-white mt-1 mb-2">
                First Drop Coming Soon
              </h3>
              <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mx-auto mb-6 leading-relaxed">
                Ranked by real verified purchases once our catalog drops. No fake bestseller rankings or fake reviews. Join our VIP guestlist to get alerted the instant inventory is unlocked.
              </p>
              <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  disabled={submittingNotify}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingNotify ? 'Saving...' : 'Notify Me'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* 6. LOOKBOOK GALLERY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[#232938]">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold mb-1">
              Visual Narrative
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-brand">
              The Atelier Lookbook
            </h2>
          </div>
          <p className="text-xs text-[#9CA3AF] max-w-sm">
            Captured on 35mm film across the historic dye quarters and brutalist architecture.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {lookbookImages.map((img, idx) => (
            <div
              key={idx}
              className="group relative aspect-4/5 rounded-xl overflow-hidden border border-[#232938] bg-[#12151D]"
            >
              <img
                src={img}
                alt={`Lookbook photo ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-[11px] font-mono text-white tracking-widest uppercase">
                  Rangrez Lookbook &middot; Frame 0{idx + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. BRAND STORY SECTION */}
      <section className="bg-[#0E1118] border-y border-[#232938] py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold mb-2">
                The Heritage
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif-brand leading-tight mb-6">
                "Rangrez": The Master Dyer of Ancient India
              </h2>
              <div className="space-y-4 text-sm text-[#9CA3AF] leading-relaxed">
                <p>
                  In traditional Indian culture, the <em>Rangrez</em> was not merely a dyer&mdash;they were an alchemist. Armed with natural vats of wild indigo leaves, crushed madder roots, and saffron threads, they brought raw textiles to life.
                </p>
                <p>
                  We created RANGREZ to bring that exacting devotion into contemporary streetwear. We do not do fast-fashion poly blends, thin 160 GSM tees, or cheap plastisol prints that crack after two washes.
                </p>
                <p>
                  Every tee is made exclusively for those who care about weight, structure, and artistic intention.
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => navigate('/about')}
                  className="px-6 py-3 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Read Our Full Story
                </button>
              </div>
            </div>

            <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
                Atelier Standard of Excellence
              </h3>
              <div className="space-y-4 text-xs text-[#D1D5DB]">
                <div className="flex justify-between py-2 border-b border-[#1C212E]">
                  <span className="text-gray-400">Cotton Grade</span>
                  <span className="font-semibold text-white">100% Combed Ringspun</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#1C212E]">
                  <span className="text-gray-400">Fabric Weight</span>
                  <span className="font-semibold text-white">240 GSM Heavyweight</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#1C212E]">
                  <span className="text-gray-400">Weave Type</span>
                  <span className="font-semibold text-white">Compact French Single Jersey</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#1C212E]">
                  <span className="text-gray-400">Finishing Process</span>
                  <span className="font-semibold text-white">Enzymatic Bio-Wash (Soft Touch)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Print Durability</span>
                  <span className="font-semibold text-emerald-400">50+ Washes Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NEWSLETTER DISPATCH */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">
          VIP Dispatch
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif-brand text-white">
          Join The Atelier Registry
        </h2>
        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mx-auto">
          Private drops, pigment study releases, and seasonal invite-only catalog reservations.
        </p>
        <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
          <input
            type="email"
            required
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 bg-[#12151D] border border-[#232938] rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E07A24]"
          />
          <button
            type="submit"
            disabled={submittingNotify}
            className="px-6 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {submittingNotify ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </section>
    </div>
  );
};
