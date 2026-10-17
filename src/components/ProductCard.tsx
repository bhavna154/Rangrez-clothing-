import React, { useState, useMemo } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import type { Product, ProductColor } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { RangrezLogo } from './RangrezLogo.tsx';
import { isDiscountActive, calculateDiscountPercent, isSaleLabelActive } from '../utils/pricing.ts';

interface ProductCardProps {
  product: Product;
  navigate: (path: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, navigate }) => {
  const { isInWishlist, toggleWishlist } = useCart();
  const wishlisted = isInWishlist(product.id);

  // Available colours strictly from SKU matrix (variants)
  const availableColors = useMemo<ProductColor[]>(() => {
    if (product.variants && product.variants.length > 0) {
      const map = new Map<string, ProductColor>();
      product.variants.forEach(v => {
        if (!v.colorName) return;
        const key = v.colorName.trim().toLowerCase();
        if (!map.has(key)) {
          const saved = product.colors?.find(c => c.name.trim().toLowerCase() === key);
          map.set(key, {
            name: v.colorName.trim(),
            hex: saved?.hex || v.colorHex || '#111827',
            secondaryHex: saved?.secondaryHex || v.secondaryHex,
            photos: saved?.photos && saved.photos.length > 0 ? saved.photos : undefined
          });
        }
      });
      return Array.from(map.values());
    }
    return product.colors || [];
  }, [product]);

  // Selected colour for photo preview on card
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(() => {
    return availableColors.length > 0 ? availableColors[0] : null;
  });

  // Calculate main and alternate photo based on selected colour
  const { mainImage, secondImage } = useMemo(() => {
    if (selectedColor?.photos && selectedColor.photos.filter(Boolean).length > 0) {
      const photos = selectedColor.photos.filter(Boolean);
      return {
        mainImage: photos[0],
        secondImage: photos[1] || photos[0]
      };
    }
    const defaultImages = (product.images || []).filter(Boolean);
    const main = defaultImages[0] || '';
    return {
      mainImage: main,
      secondImage: defaultImages[1] || main
    };
  }, [selectedColor, product.images]);

  // Price, discount & sale schedule resolution
  const effectivePrice = selectedColor?.price ?? product.price;
  const effectiveMrp = selectedColor?.mrp ?? product.mrp;
  const hasDiscount = isDiscountActive(
    effectiveMrp,
    effectivePrice,
    product.saleStartDate,
    product.saleEndDate
  );
  const discountPercent = hasDiscount
    ? calculateDiscountPercent(effectiveMrp!, effectivePrice)
    : 0;
  const hasSaleLabel = isSaleLabelActive(
    product.saleLabel,
    product.saleStartDate,
    product.saleEndDate
  );

  return (
    <div
      onClick={() => navigate(`/product/${product.slug || product.id}`)}
      className="group bg-[#12151D] border border-[#232938] hover:border-[#384157] rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col"
    >
      {/* Image Container (65-75% height) */}
      <div className="relative aspect-4/5 bg-[#171B26] overflow-hidden">
        {/* Optional Sale Label Badge */}
        {hasSaleLabel && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E07A24] text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{product.saleLabel}</span>
            </span>
          </div>
        )}

        {mainImage ? (
          <>
            <img
              src={mainImage}
              alt={`${product.name} - ${selectedColor?.name || 'garment'}`}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                secondImage !== mainImage ? 'group-hover:opacity-0' : ''
              }`}
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {secondImage !== mainImage && (
              <img
                src={secondImage}
                alt={`${product.name} alternate view`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-105"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#4B5563] p-6 text-center">
            <RangrezLogo variant="full" size="sm" light={true} />
            <span className="text-[11px] text-gray-500 mt-2 font-mono uppercase tracking-wider">{product.fit}</span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
            wishlisted
              ? 'bg-[#8E2834] text-white shadow-md'
              : 'bg-[#0B0D12]/60 text-gray-300 hover:text-white hover:bg-[#0B0D12]/90'
          }`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Info Container */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata (Zero-pill discipline) */}
          {(product.fit || (product.gsm && Number(product.gsm) > 0)) && (
            <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] mb-1.5 font-medium">
              {product.fit && <span>{product.fit}</span>}
              {product.fit && product.gsm && Number(product.gsm) > 0 && <span aria-hidden="true">&middot;</span>}
              {product.gsm && Number(product.gsm) > 0 && <span>{product.gsm} GSM</span>}
            </div>
          )}

          <h3 className="text-sm font-semibold text-white tracking-wide group-hover:text-[#E07A24] transition-colors line-clamp-1">
            {product.name}
          </h3>
        </div>

        <div className="mt-3 pt-3 border-t border-[#1C212E] flex items-center justify-between gap-2">
          {/* Real Selling Price & Optional Discount (ONLY when MRP > price) */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white tabular-nums">
              ₹{effectivePrice}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xs text-gray-500 line-through tabular-nums">
                  ₹{effectiveMrp}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 tabular-nums">
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          {/* Color Swatch Dots: Strictly from SKU matrix with two-tone and preview switching */}
          {availableColors.length > 0 && (
            <div className="flex items-center gap-1.5" title={`${availableColors.length} shade(s) available`}>
              {availableColors.slice(0, 5).map((c, idx) => {
                const isSelected = selectedColor?.name.toLowerCase() === c.name.toLowerCase();
                const swatchBg = c.secondaryHex
                  ? `linear-gradient(135deg, ${c.hex} 50%, ${c.secondaryHex} 50%)`
                  : c.hex;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedColor(c);
                    }}
                    onMouseEnter={() => setSelectedColor(c)}
                    className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer shadow-xs ${
                      isSelected ? 'border-[#E07A24] ring-2 ring-[#E07A24]/50 scale-125' : 'border-[#0B0D12] hover:scale-110'
                    }`}
                    style={{ background: swatchBg }}
                    title={c.secondaryHex ? `${c.name} (Two-Tone Swatch)` : c.name}
                    aria-label={`Preview ${c.name}`}
                  />
                );
              })}
              {availableColors.length > 5 && (
                <span className="text-[10px] text-gray-400 pl-0.5">
                  +{availableColors.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
