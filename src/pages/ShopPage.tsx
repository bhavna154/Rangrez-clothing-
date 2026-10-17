import React, { useState, useEffect } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Search } from 'lucide-react';
import type { Product, TShirtFit, TShirtSize } from '../types/index.ts';
import { ProductCard } from '../components/ProductCard.tsx';

interface ShopPageProps {
  navigate: (path: string) => void;
  initialFit?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({ navigate, initialFit }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedFit, setSelectedFit] = useState<string>(initialFit || 'all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fits: (TShirtFit | 'all')[] = ['all', 'Oversized', 'Relaxed', 'Regular Boxy', 'Drop Shoulder'];
  const sizes: (TShirtSize | 'all')[] = ['all', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedFit !== 'all') params.append('fit', selectedFit);
    if (selectedSize !== 'all') params.append('size', selectedSize);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    params.append('sort', sortBy);

    fetch(`/api/products?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(err => console.error('Failed to fetch products:', err))
      .finally(() => setLoading(false));
  }, [selectedFit, selectedSize, sortBy, searchQuery]);

  const resetFilters = () => {
    setSelectedFit('all');
    setSelectedSize('all');
    setSortBy('newest');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Title & Breadcrumb */}
      <div className="mb-8 pb-6 border-b border-[#232938]">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-serif-brand">
          T-Shirt Catalog
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-2">
          Heavyweight 240 GSM tees crafted exclusively with own bespoke printed artwork.
        </p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#12151D] border border-[#232938] p-4 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search silhouettes..."
            className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E07A24]"
          />
        </div>

        {/* Desktop Filter Tabs (Allowed for functional button state per guidelines) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-[#0B0D12] border border-[#232938] rounded-lg">
          {fits.map(fit => (
            <button
              key={fit}
              onClick={() => setSelectedFit(fit)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                selectedFit === fit
                  ? 'bg-[#E07A24] text-white shadow-xs'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {fit === 'all' ? 'All Fits' : fit}
            </button>
          ))}
        </div>

        {/* Sort and Mobile Filter Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-[#0B0D12] border border-[#232938] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E07A24] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] text-xs font-semibold rounded-lg text-white border border-[#2B3245] cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      {/* Main Grid & Filters Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Desktop Sidebar Filter (Left) */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E07A24]" />
                Refine by Size
              </span>
              {(selectedFit !== 'all' || selectedSize !== 'all' || searchQuery) && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-[#E07A24] hover:underline cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Size Filter */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-3">Sizes</p>
              <div className="grid grid-cols-3 gap-1.5">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-1.5 px-2 text-xs font-mono rounded border transition-colors cursor-pointer text-center ${
                      selectedSize === size
                        ? 'bg-[#E07A24] border-[#E07A24] text-white font-bold'
                        : 'border-[#232938] bg-[#0B0D12] text-gray-400 hover:text-white hover:border-[#384157]'
                    }`}
                  >
                    {size === 'all' ? 'All' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Specification Notes */}
            <div className="pt-4 border-t border-[#232938] text-[11px] text-[#9CA3AF] space-y-2">
              <p className="font-semibold text-white">Fabric Specifications:</p>
              <p>&middot; 100% Combed Ringspun Cotton</p>
              <p>&middot; 240 GSM French Single Jersey</p>
              <p>&middot; Pre-shrunk & Bio-washed</p>
              <p>&middot; Lycra Rib Collar (Never roll-ups)</p>
            </div>
          </div>
        </div>

        {/* Product Grid (Right 3 cols) */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-[#12151D] border border-[#232938] rounded-xl aspect-4/5 animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(prod => (
                <ProductCard key={prod.id} product={prod} navigate={navigate} />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-12 text-center">
              <h3 className="text-lg font-bold font-serif-brand text-white mb-2">
                No T-Shirts Found
              </h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto mb-6">
                {searchQuery || selectedFit !== 'all' || selectedSize !== 'all'
                  ? 'Try clearing your current filters to view other available pieces.'
                  : 'The catalog is currently empty. Visit the admin portal to add your first premium design.'}
              </p>
              {searchQuery || selectedFit !== 'all' || selectedSize !== 'all' ? (
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-5 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Manage Products in Admin
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="w-4/5 max-w-sm bg-[#12151D] h-full p-6 flex flex-col justify-between border-l border-[#232938]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#232938]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Refine Filters</h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Fit filter */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-300 mb-2">Silhouette Fit</p>
                <div className="flex flex-col gap-1.5">
                  {fits.map(fit => (
                    <button
                      key={fit}
                      onClick={() => setSelectedFit(fit)}
                      className={`px-3 py-2 text-xs text-left rounded-md transition-colors cursor-pointer ${
                        selectedFit === fit
                          ? 'bg-[#E07A24] text-white font-semibold'
                          : 'bg-[#1A1E29] text-gray-300'
                      }`}
                    >
                      {fit === 'all' ? 'All Fits' : fit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size filter */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-300 mb-2">Available Size</p>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 text-xs text-center font-mono rounded-md transition-colors cursor-pointer ${
                        selectedSize === size
                          ? 'bg-[#E07A24] text-white font-bold'
                          : 'bg-[#1A1E29] text-gray-300'
                      }`}
                    >
                      {size === 'all' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#232938] flex gap-2">
              <button
                onClick={resetFilters}
                className="flex-1 py-2.5 bg-[#1A1E29] text-gray-300 text-xs font-semibold rounded-lg"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-[#E07A24] text-white text-xs font-semibold rounded-lg"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
